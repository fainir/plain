from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path
import os
import time
from datetime import datetime
from uuid import uuid4
from anthropic import Anthropic
from dotenv import load_dotenv
from category_utils import get_category_descendants, build_category_tree, filter_data_by_categories
from typing import Optional, Dict, Any, List, Tuple, Union
from supabase_data import (
    get_user_workspaces,
    get_workspace_schemas,
    get_table_data,
    get_workspace_categories,
    get_workspace_by_id,
    create_default_workspace_structure,
    insert_plan_data,
    get_or_create_life_workspace,
    is_user_workspace_member
)
from supabase_client import get_supabase_client

# Load environment variables
load_dotenv()


# Initialize Supabase
supabase = get_supabase_client()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load schema
schema_path = Path(__file__).parent / "schema.json"
with open(schema_path, "r") as f:
    SCHEMA = json.load(f)

# Load planning categories
categories_path = Path(__file__).parent / "planning_categories.json"
with open(categories_path, "r") as f:
    PLANNING_CATEGORIES = json.load(f)

ASSISTANT_SYSTEM_PROMPT = """You are Plain's AI concierge. Help the user clarify their request, share next steps, and keep responses concise and encouraging.

Before handing off to a Plain Guide, always collect the structured details a human will need (who, what, when, where, constraints, budget, special instructions). Ask follow-up questions until you can summarize the request in one short paragraph.

Use the `handoff_to_human` tool only when:
- The user asks you to perform an action you cannot execute (travel booking, purchases, paperwork, etc.)
- They explicitly request a human
- The topic is sensitive (finance, legal, compliance) and requires a Plain Guide

When you do call the tool, include the concise summary of the gathered details. Do not mention that a Plain Guide is being looped in when speaking to the member; just give the best guidance you can while the platform quietly coordinates support."""

CONCIERGE_TOOLS = [
    {
        "name": "handoff_to_human",
        "description": "Use when a Plain Guide should take over, for example booking travel, making purchases, processing sensitive data, or whenever the member explicitly asks for a human.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Why a Plain Guide is needed (e.g., 'Member needs help booking a flight')."
                },
                "details": {
                    "type": "string",
                    "description": "Concise summary of all information gathered from the member (who it's for, objective, dates/times, budget, constraints, etc.). Mention 'details not provided' only after at least one clarification attempt."
                },
                "specialty": {
                    "type": "string",
                    "description": "Suggested specialty for the human guide (finance, fitness, learning, career, life, food, planner)."
                },
                "urgency": {
                    "type": "string",
                    "enum": ["low", "normal", "high"],
                    "description": "How time-sensitive the handoff is."
                }
            },
            "required": ["reason", "details"]
        }
    }
]

HUMAN_ASSISTANTS: List[Dict[str, Any]] = [
    {
        "id": "wellness-strategist",
        "name": "Maya Cohen",
        "title": "Holistic Wellness Strategist",
        "specialties": ["fitness", "life", "learning", "food"],
        "bio": "Helps members translate health ambitions into practical daily systems.",
        "status": "available"
    },
    {
        "id": "finance-architect",
        "name": "Leo Martinez",
        "title": "Financial Systems Architect",
        "specialties": ["finance", "career"],
        "bio": "Guides budgeting, investing, and compensation planning conversations.",
        "status": "available"
    },
    {
        "id": "operations-coach",
        "name": "Priya Desai",
        "title": "Life Operations Coach",
        "specialties": ["career", "life", "planner"],
        "bio": "Steps in when members feel blocked and need structured accountability.",
        "status": "available"
    }
]

SPECIALTY_KEYWORDS: Dict[str, List[str]] = {
    "finance": ["budget", "money", "tax", "salary", "compensation", "investment", "debt", "loan"],
    "fitness": ["workout", "training", "fitness", "exercise", "injury", "recovery"],
    "learning": ["study", "course", "learning", "education", "school"],
    "career": ["career", "promotion", "manager", "team", "work", "project"],
    "life": ["overwhelmed", "burnout", "stress", "life", "family"],
    "food": ["nutrition", "diet", "meal", "food", "recipe"],
    "planner": ["plan", "planning", "system", "workflow"]
}

ESCALATION_TRIGGERS = {"escalate", "human", "urgent", "stuck", "expert", "call", "talk to someone"}
HUMAN_TASK_PHRASES = {
    "book a flight",
    "book flight",
    "book tickets",
    "book a hotel",
    "book hotel",
    "reserve a table",
    "reserve hotel",
    "schedule appointment",
    "make a payment",
    "pay my bill",
    "finish paperwork",
    "submit paperwork",
    "talk to travel agent",
    "speak to a person",
}

ASSISTANT_SESSIONS: Dict[str, Dict[str, Any]] = {}


def determine_specialty(message: str) -> Optional[str]:
    text = message.lower()
    for specialty, keywords in SPECIALTY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return specialty
    return None


def should_escalate_to_human(message: str, assistant_text: str, human_joined: bool) -> bool:
    if human_joined:
        return False
    combined = f"{message} {assistant_text}".lower()
    if any(trigger in combined for trigger in ESCALATION_TRIGGERS):
        return True
    if any(phrase in combined for phrase in HUMAN_TASK_PHRASES):
        return True
    specialty = determine_specialty(message)
    return specialty in {"finance", "career"}  # auto-escalate sensitive domains


def select_human_assistant(topic: Optional[str]) -> Optional[Dict[str, Any]]:
    if not topic:
        return None
    for assistant in HUMAN_ASSISTANTS:
        if topic in assistant["specialties"]:
            return assistant
    return HUMAN_ASSISTANTS[0] if HUMAN_ASSISTANTS else None


def get_or_create_assistant_session(session_id: str) -> Dict[str, Any]:
    session = ASSISTANT_SESSIONS.get(session_id)
    if not session:
        session = {
            "ai_history": [],
            "transcript": [],
            "human": None,
            "created_at": time.time(),
            "connections": []
        }
        ASSISTANT_SESSIONS[session_id] = session
    return session


def append_transcript_entry(session: Dict[str, Any], role: str, content: str, sender_name: Optional[str] = None):
    entry = {
        "id": str(uuid4()),
        "role": role,
        "content": content,
        "senderName": sender_name,
        "timestamp": datetime.utcnow().isoformat()
    }
    session["transcript"].append(entry)
    return entry


def format_transcript(transcript: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return transcript[-200:]  # limit payload size while preserving structure


async def broadcast_to_session(session: Dict[str, Any], payload: Dict[str, Any], skip: Optional[WebSocket] = None):
    stale_connections: List[WebSocket] = []
    for connection in session.get("connections", []):
        if skip and connection is skip:
            continue
        try:
            await connection.send_json(payload)
        except Exception:
            stale_connections.append(connection)
    for stale in stale_connections:
        if stale in session["connections"]:
            session["connections"].remove(stale)


async def broadcast_chat_message(session: Dict[str, Any], message: Dict[str, Any], skip: Optional[WebSocket] = None):
    await broadcast_to_session(session, {"type": "chat_message", "message": message}, skip=skip)


def generate_concierge_response(
    session: Dict[str, Any]
) -> Tuple[str, Optional[Dict[str, Any]], Optional[str], Dict[str, Any]]:
    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1200,
            system=ASSISTANT_SYSTEM_PROMPT,
            messages=session["ai_history"],
            tools=CONCIERGE_TOOLS
        )
    except Exception as ai_error:
        raise RuntimeError(f"Assistant model error: {ai_error}")

    assistant_text = ""
    handoff_request: Optional[Dict[str, Any]] = None
    handoff_tool_id: Optional[str] = None
    for block in response.content:
        if block.type == "text":
            assistant_text += block.text
        elif block.type == "tool_use" and block.name == "handoff_to_human":
            handoff_request = block.input or {}
            handoff_tool_id = block.id

    assistant_text = assistant_text.strip() or "I'm here and thinking through this with you."
    session["ai_history"].append({
        "role": "assistant",
        "content": response.content
    })
    entry = append_transcript_entry(session, "ai", assistant_text, "Plain AI")
    return assistant_text, handoff_request, handoff_tool_id, entry


def ensure_workspace_read_access(workspace_id: str, authorization: Optional[str]):
    """
    Validate read access for a workspace.
    Returns (workspace, error_response) where error_response is (payload, status_code) or None on success.
    """
    workspace = get_workspace_by_id(workspace_id)
    if not workspace:
        return None, ({"error": "Workspace not found"}, 404)

    created_by = workspace.get("created_by")

    # Allow public access for guest workspaces (no owner yet)
    if created_by is None:
        return workspace, None

    if not authorization or not authorization.startswith("Bearer "):
        return workspace, ({"error": "Unauthorized"}, 401)

    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return workspace, ({"error": "Unauthorized"}, 401)
    except Exception as auth_error:
        print(f"Error validating workspace access token: {auth_error}")
        return workspace, ({"error": "Unauthorized"}, 401)

    user_id = user_response.user.id

    if created_by != user_id and not is_user_workspace_member(workspace_id, user_id):
        return workspace, ({"error": "Forbidden"}, 403)

    return workspace, None


@app.websocket("/ws/assistant/{session_id}")
async def assistant_concierge(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session = get_or_create_assistant_session(session_id)
    session["connections"].append(websocket)

    # send snapshot so reconnecting clients can rebuild history
    await websocket.send_json({
        "type": "session_snapshot",
        "messages": format_transcript(session["transcript"]),
        "humanAssistant": session["human"]
    })

    try:
        while True:
            data = await websocket.receive_json()
            sender = data.get("sender", "user")
            message = data.get("message", "").strip()

            if not message:
                continue

            if sender == "user":
                user_entry = append_transcript_entry(session, "user", message, "You")
                await broadcast_chat_message(session, user_entry)
                session["ai_history"].append({
                    "role": "user",
                    "content": [{"type": "text", "text": message}]
                })

                try:
                    assistant_reply, handoff_request, handoff_tool_id, ai_entry = generate_concierge_response(session)
                except Exception as assistant_error:
                    error_message = f"Assistant unavailable: {assistant_error}"
                    append_transcript_entry(session, "system", error_message)
                    await websocket.send_json({"type": "error", "content": error_message})
                    continue

                handoff_reason = handoff_request.get("reason") if handoff_request else None
                escalation_topic = (
                    handoff_request.get("specialty") if handoff_request else determine_specialty(message)
                )
                needs_human = (
                    handoff_request is not None
                    or should_escalate_to_human(message, assistant_reply, session["human"] is not None)
                )
                ai_entry["content"] = assistant_reply
                tool_result_text: Optional[str] = None

                if needs_human and not session["human"]:
                    human = select_human_assistant(escalation_topic)
                    if human:
                        session["human"] = human
                        await broadcast_chat_message(session, ai_entry)
                        if handoff_tool_id:
                            result_text = f"Assigned {human['name']} ({human['title']})"
                            session["ai_history"].append({
                                "role": "user",
                                "content": [{
                                    "type": "tool_result",
                                    "tool_use_id": handoff_tool_id,
                                    "content": result_text
                                }]
                            })
                        await broadcast_to_session(session, {
                            "type": "human_joined",
                            "assistant": human,
                            "handoffReason": handoff_reason,
                            "specialty": escalation_topic,
                            "urgency": handoff_request.get("urgency") if handoff_request else None
                        })
                        continue
                    else:
                        tool_result_text = "No Plain Guide is available at the moment. Staying with AI support."
                elif handoff_tool_id and session.get("human"):
                    tool_result_text = f"{session['human']['name']} is already assisting in this chat."

                if handoff_tool_id:
                    if tool_result_text is None:
                        tool_result_text = "Handoff request acknowledged."
                    session["ai_history"].append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": handoff_tool_id,
                            "content": tool_result_text
                        }]
                    })

                await broadcast_chat_message(session, ai_entry)

            elif sender == "human":
                human = session.get("human")
                requested_id = data.get("assistantId")

                if not human or human["id"] != requested_id:
                    await websocket.send_json({
                        "type": "error",
                        "content": "No human assistant is currently assigned or ID mismatch."
                    })
                    continue

                human_entry = append_transcript_entry(session, "human", message, human["name"])
                await broadcast_chat_message(session, human_entry)
            else:
                await websocket.send_json({
                    "type": "error",
                    "content": "Unsupported sender type."
                })

    except WebSocketDisconnect:
        print("Assistant client disconnected")
    except Exception as e:
        print(f"Assistant websocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "content": f"Server error: {e}"})
        except Exception:
            pass
    finally:
        if websocket in session["connections"]:
            session["connections"].remove(websocket)

@app.get("/")
async def root():
    return {"message": "Plain - Life Planning System"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/schema")
async def get_schema():
    """Get the complete system schema including tables, views, and relationships"""
    return SCHEMA

@app.get("/api/schema/tables")
async def get_tables():
    """Get list of all tables with metadata"""
    return {
        "tables": [
            {
                "id": table_id,
                "displayName": table_data["displayName"],
                "icon": table_data["icon"],
                "columnCount": len(table_data["columns"])
            }
            for table_id, table_data in SCHEMA["tables"].items()
        ]
    }

@app.get("/api/schema/views")
async def get_views():
    """Get list of all views grouped by category"""
    views_by_category = {}
    for view_id, view_data in SCHEMA["views"].items():
        category = view_data.get("category", "Other")
        if category not in views_by_category:
            views_by_category[category] = []
        views_by_category[category].append({
            "id": view_id,
            "displayName": view_data["displayName"],
            "icon": view_data["icon"]
        })
    return {"viewsByCategory": views_by_category}

@app.get("/api/schema/table/{table_id}")
async def get_table_schema(table_id: str):
    """Get detailed schema for a specific table"""
    if table_id not in SCHEMA["tables"]:
        return {"error": "Table not found"}, 404
    return SCHEMA["tables"][table_id]

@app.get("/api/schema/view/{view_id}")
async def get_view_schema(view_id: str):
    """Get detailed schema for a specific view"""
    if view_id not in SCHEMA["views"]:
        return {"error": "View not found"}, 404
    return SCHEMA["views"][view_id]

# Planning categories endpoints
@app.get("/api/planning/categories")
async def get_planning_categories():
    """Get all planning categories"""
    return PLANNING_CATEGORIES

@app.get("/api/planning/category/{category_slug}")
async def get_planning_category(category_slug: str):
    """Get a specific planning category by slug"""
    for category in PLANNING_CATEGORIES["categories"]:
        if category["slug"] == category_slug:
            return category
    return {"error": "Category not found"}, 404

# Workspace management (Supabase)
@app.get("/api/workspaces")
async def get_workspaces(authorization: Optional[str] = Header(None)):
    """Get all workspaces for the authenticated user"""
    try:
        # Extract token from Authorization header
        if not authorization or not authorization.startswith("Bearer "):
            return {"workspaces": []}

        token = authorization.replace("Bearer ", "")

        # Get user from token
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"workspaces": []}

        user_id = user_response.user.id

        # Get user's workspaces
        workspaces = get_user_workspaces(user_id)

        return {"workspaces": workspaces}
    except Exception as e:
        print(f"Error getting workspaces: {e}")
        return {"workspaces": []}


@app.post("/api/workspaces")
async def create_workspace(request: dict, authorization: Optional[str] = Header(None)):
    """Create a new workspace with default tables, views, and categories"""
    try:
        # Extract token from Authorization header
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")

        # Get user from token
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        user_id = user_response.user.id

        # Extract workspace details
        name = request.get("name", "Untitled Workspace")
        icon = request.get("icon", "📁")
        description = request.get("description", "")

        # Create workspace
        workspace_result = supabase.table("workspaces").insert({
            "name": name,
            "icon": icon,
            "description": description,
            "created_by": user_id
        }).execute()

        if not workspace_result.data:
            return {"error": "Failed to create workspace"}, 500

        workspace = workspace_result.data[0]
        workspace_id = workspace.get("id")

        # Add user as workspace member
        supabase.table("workspace_members").insert({
            "workspace_id": workspace_id,
            "user_id": user_id,
            "role": "owner"
        }).execute()

        # Create default tables, views, and categories
        create_default_workspace_structure(workspace_id, SCHEMA)

        return workspace
    except Exception as e:
        print(f"Error creating workspace: {e}")
        return {"error": str(e)}, 500

@app.patch("/api/workspaces/{workspace_id}")
async def update_workspace(workspace_id: str, request: dict, authorization: Optional[str] = Header(None)):
    """Update workspace settings (name, icon, description)"""
    try:
        # Verify authentication
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        user_id = user_response.user.id

        # Verify user has access to workspace
        member_check = supabase.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        if not member_check.data:
            return {"error": "Access denied"}, 403

        # Extract update fields
        update_data = {}
        if "name" in request:
            update_data["name"] = request["name"]
        if "icon" in request:
            update_data["icon"] = request["icon"]
        if "description" in request:
            update_data["description"] = request["description"]

        if not update_data:
            return {"error": "No fields to update"}, 400

        # Update workspace
        result = supabase.table("workspaces").update(update_data).eq("id", workspace_id).execute()

        if result.data:
            return result.data[0]
        else:
            return {"error": "Failed to update workspace"}, 500

    except Exception as e:
        print(f"Error updating workspace: {e}")
        return {"error": str(e)}, 500

@app.delete("/api/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, authorization: Optional[str] = Header(None)):
    """Delete a workspace and all its data"""
    try:
        # Verify authentication
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        user_id = user_response.user.id

        # Verify user is owner of workspace
        member_check = supabase.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
        if not member_check.data or member_check.data[0].get("role") != "owner":
            return {"error": "Only workspace owners can delete workspaces"}, 403

        # Delete workspace (cascading deletes will handle related data via foreign keys)
        result = supabase.table("workspaces").delete().eq("id", workspace_id).execute()

        if result.data:
            return {"message": "Workspace deleted successfully"}
        else:
            return {"error": "Failed to delete workspace"}, 500

    except Exception as e:
        print(f"Error deleting workspace: {e}")
        return {"error": str(e)}, 500

@app.post("/api/workspaces/persist-guest-plan")
async def persist_guest_plan(request: dict, authorization: Optional[str] = Header(None)):
    """Convert guest plan from localStorage into a new workspace with structured data"""
    try:
        # Extract token from Authorization header
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")

        # Get user from token
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        user_id = user_response.user.id

        # Extract guest plan data
        planner_type = request.get("plannerType", "life")
        messages = request.get("messages", [])

        if not messages:
            return {"error": "No messages to persist"}, 400

        # Create workspace with planner-specific name and icon
        planner_icons = {
            "life": "🙂",
            "food": "🍽️",
            "fitness": "🏋️",
            "finance": "💰",
            "career": "💼",
            "learning": "📚"
        }

        planner_names = {
            "life": "Life Planner",
            "food": "Food Planner",
            "fitness": "Fitness Tracker",
            "finance": "Finance Manager",
            "career": "Career Planner",
            "learning": "Learning Planner"
        }

        workspace_name = planner_names.get(planner_type, "Life Planner")
        workspace_icon = planner_icons.get(planner_type, "🙂")

        # Create workspace
        workspace_result = supabase.table("workspaces").insert({
            "name": workspace_name,
            "icon": workspace_icon,
            "description": f"Created from {planner_type} planner",
            "created_by": user_id
        }).execute()

        if not workspace_result.data:
            return {"error": "Failed to create workspace"}, 500

        workspace = workspace_result.data[0]
        workspace_id = workspace.get("id")

        # Add user as workspace member
        supabase.table("workspace_members").insert({
            "workspace_id": workspace_id,
            "user_id": user_id,
            "role": "owner"
        }).execute()

        # Create default tables, views, and categories
        create_default_workspace_structure(workspace_id, SCHEMA)

        # TODO: Use AI to extract structured data from chat messages and populate workspace
        # For now, we just create the workspace with default structure
        # Future: Parse messages and create goals, actions, etc.

        return {
            "workspace": workspace,
            "message": "Workspace created successfully. Chat history preserved."
        }
    except Exception as e:
        print(f"Error persisting guest plan: {e}")
        return {"error": str(e)}, 500

@app.post("/api/workspaces/associate-guest")
async def associate_guest_workspace(request: dict, authorization: Optional[str] = Header(None)):
    """Associate an existing guest workspace with an authenticated user"""
    try:
        # Extract token from Authorization header
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")

        # Get user from token
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        user_id = user_response.user.id
        workspace_id = request.get("workspaceId")

        if not workspace_id:
            return {"error": "Missing workspaceId"}, 400

        # Check if workspace exists
        workspace_result = supabase.table("workspaces").select("*").eq("id", workspace_id).execute()

        if not workspace_result.data:
            return {"error": "Workspace not found"}, 404

        workspace = workspace_result.data[0]

        # Update workspace to associate with user
        supabase.table("workspaces").update({
            "created_by": user_id
        }).eq("id", workspace_id).execute()

        # Add user as workspace member with owner role
        # First check if member relationship already exists
        existing_member = supabase.table("workspace_members").select("*").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()

        if not existing_member.data:
            supabase.table("workspace_members").insert({
                "workspace_id": workspace_id,
                "user_id": user_id,
                "role": "owner"
            }).execute()

        return {
            "workspace": workspace,
            "message": "Workspace successfully associated with your account"
        }
    except Exception as e:
        print(f"Error associating guest workspace: {e}")
        return {"error": str(e)}, 500


@app.post("/api/dev/demo-user")
async def create_demo_user():
    """
    Development helper: create a demo account and return credentials plus session token.
    WARNING: expose only in development environments.
    """
    if os.getenv("ENVIRONMENT") == "production":
        return {"error": "Not available"}, 403

    try:
        demo_email = f"dev-{int(time.time()*1000)}-{os.urandom(2).hex()}@example.com"
        demo_password = f"Demo{os.urandom(4).hex()}"

        # Use sign_up instead of admin.create_user to avoid permission issues
        sign_up_response = supabase.auth.sign_up({
            "email": demo_email,
            "password": demo_password
        })

        if getattr(sign_up_response, "error", None):
            error_msg = str(sign_up_response.error)
            print(f"Error creating demo user: {error_msg}")
            if "not allowed" in error_msg.lower():
                return {"error": "Email signups are disabled. Please enable them in Supabase Dashboard → Authentication → Providers → Email → Enable sign up"}, 400
            return {"error": error_msg}, 400

        # Get session from sign_up response
        session = getattr(sign_up_response, "session", None)
        if not session:
            return {"error": "Failed to obtain session"}, 500

        return {
            "email": demo_email,
            "password": demo_password,
            "access_token": session.access_token,
            "refresh_token": session.refresh_token
        }
    except Exception as e:
        error_msg = str(e)
        print(f"Error creating demo user: {error_msg}")
        if "not allowed" in error_msg.lower():
            return {"error": "Email signups are disabled. Please enable them in Supabase Dashboard → Authentication → Providers → Email → Enable sign up"}, 400
        return {"error": error_msg}, 500

# Project management (Legacy - keep for backwards compatibility)
@app.get("/api/projects")
async def get_projects():
    """Get all projects - DEPRECATED: Use /api/workspaces instead"""
    projects_dir = Path(__file__).parent / "projects"
    projects = []

    if projects_dir.exists():
        for project_dir in projects_dir.iterdir():
            if project_dir.is_dir():
                meta_path = project_dir / "meta.json"
                if meta_path.exists():
                    with open(meta_path, "r") as f:
                        project_meta = json.load(f)
                        projects.append(project_meta)

    return {"projects": projects}

@app.post("/api/projects")
async def create_project(request: dict):
    """Create a new project"""
    import uuid
    from datetime import datetime

    project_id = str(uuid.uuid4())
    project_name = request.get("name", "Untitled Project")
    category = request.get("category", "general")

    # Create project directory
    project_dir = Path(__file__).parent / "projects" / project_id
    project_dir.mkdir(parents=True, exist_ok=True)

    # Create data directory for project
    data_dir = project_dir / "data"
    data_dir.mkdir(exist_ok=True)

    # Create project metadata with workspaces
    project_meta = {
        "id": project_id,
        "name": project_name,
        "category": category,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
        "workspaces": [
            {
                "id": "life",
                "name": "Life Planner",
                "icon": "🌟",
                "description": "Personal life planning"
            },
            {
                "id": "company",
                "name": "Company Planner",
                "icon": "🏢",
                "description": "Business and company planning"
            }
        ]
    }

    # Save metadata
    with open(project_dir / "meta.json", "w") as f:
        json.dump(project_meta, f, indent=2)

    # Initialize with empty data files for each table
    for table_id in SCHEMA["tables"].keys():
        with open(data_dir / f"{table_id}.json", "w") as f:
            json.dump([], f)

    # Initialize with default categories
    categories_path = project_dir / "categories.json"
    default_categories = SCHEMA.get("default_categories", [])
    with open(categories_path, "w") as f:
        json.dump(default_categories, f, indent=2)

    return project_meta

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get project metadata"""
    project_dir = Path(__file__).parent / "projects" / project_id
    meta_path = project_dir / "meta.json"

    if not meta_path.exists():
        return {"error": "Project not found"}, 404

    with open(meta_path, "r") as f:
        return json.load(f)

# Category Management Endpoints
@app.get("/api/projects/{project_id}/categories")
async def get_project_categories(project_id: str):
    """Get all categories for a project (hierarchical tree)"""
    project_dir = Path(__file__).parent / "projects" / project_id
    categories_path = project_dir / "categories.json"

    # Load categories or use defaults
    if categories_path.exists():
        with open(categories_path, "r") as f:
            categories = json.load(f)
    else:
        # Use default categories from schema
        categories = SCHEMA.get("default_categories", [])

    # Build tree structure
    tree = build_category_tree(categories)

    return {
        "categories": categories,
        "tree": tree
    }

@app.post("/api/projects/{project_id}/categories")
async def create_project_category(project_id: str, category_data: dict):
    """Create a new category for a project"""
    import uuid

    project_dir = Path(__file__).parent / "projects" / project_id
    categories_path = project_dir / "categories.json"

    # Load existing categories
    if categories_path.exists():
        with open(categories_path, "r") as f:
            categories = json.load(f)
    else:
        categories = SCHEMA.get("default_categories", []).copy()

    # Create new category
    new_category = {
        "id": category_data.get("id", str(uuid.uuid4())),
        "name": category_data.get("name", "New Category"),
        "icon": category_data.get("icon", "📁"),
        "color": category_data.get("color", "gray"),
        "parent_id": category_data.get("parent_id")
    }

    categories.append(new_category)

    # Save categories
    with open(categories_path, "w") as f:
        json.dump(categories, f, indent=2)

    return new_category

@app.patch("/api/projects/{project_id}/categories/{category_id}")
async def update_project_category(project_id: str, category_id: str, update_data: dict):
    """Update a category"""
    project_dir = Path(__file__).parent / "projects" / project_id
    categories_path = project_dir / "categories.json"

    if not categories_path.exists():
        return {"error": "Categories not found"}, 404

    with open(categories_path, "r") as f:
        categories = json.load(f)

    # Find and update category
    category = next((c for c in categories if c["id"] == category_id), None)
    if not category:
        return {"error": "Category not found"}, 404

    # Update fields
    for key, value in update_data.items():
        if key != "id":  # Don't allow changing ID
            category[key] = value

    # Save categories
    with open(categories_path, "w") as f:
        json.dump(categories, f, indent=2)

    return category

@app.delete("/api/projects/{project_id}/categories/{category_id}")
async def delete_project_category(project_id: str, category_id: str):
    """Delete a category"""
    project_dir = Path(__file__).parent / "projects" / project_id
    categories_path = project_dir / "categories.json"

    if not categories_path.exists():
        return {"error": "Categories not found"}, 404

    with open(categories_path, "r") as f:
        categories = json.load(f)

    # Remove category
    categories = [c for c in categories if c["id"] != category_id]

    # Save categories
    with open(categories_path, "w") as f:
        json.dump(categories, f, indent=2)

    return {"success": True}

# Generic data endpoints
def load_table_data(table_id: str, project_id: str = None):
    """Load data from JSON file for a given table"""
    if project_id:
        data_path = Path(__file__).parent / "projects" / project_id / "data" / f"{table_id}.json"
    else:
        # Fallback to demo data
        data_path = Path(__file__).parent / "data" / f"{table_id}.json"

    if data_path.exists():
        with open(data_path, "r") as f:
            return json.load(f)
    return []

# Project-scoped schema endpoints
@app.get("/api/projects/{project_id}/schema/tables")
async def get_project_tables(project_id: str):
    """Get list of all tables for a project"""
    return await get_tables()

@app.get("/api/projects/{project_id}/schema/views")
async def get_project_views(project_id: str):
    """Get list of all views for a project"""
    return await get_views()

# New workspace-based endpoint
@app.get("/api/workspaces/{workspace_id}/data/{table_id}")
async def get_workspace_table_data(workspace_id: str, table_id: str, categories: Optional[str] = None):
    """Get all data for a specific table in a workspace (Supabase)"""
    if table_id not in SCHEMA["tables"]:
        return {"error": "Table not found"}, 404

    # Get category IDs if filtering requested
    category_ids = categories.split(",") if categories else None

    # Get data from Supabase
    data = get_table_data(workspace_id, table_id, category_ids)

    return {
        "table_id": table_id,
        "schema": SCHEMA["tables"][table_id],
        "data": data
    }


@app.post("/api/workspaces/{workspace_id}/data/{table_id}")
async def create_workspace_table_row(workspace_id: str, table_id: str, request: dict, authorization: Optional[str] = Header(None)):
    """Create a new row in a table (Supabase)"""
    try:
        # Verify user has access to workspace
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        if table_id not in SCHEMA["tables"]:
            return {"error": "Table not found"}, 404

        # Generate row ID
        import uuid
        row_id = str(uuid.uuid4())

        # Add row to database
        from supabase_data import add_table_row
        row_data = request.get("data", {})
        row_data["id"] = row_id  # Ensure ID is in the data

        success = add_table_row(workspace_id, table_id, row_id, row_data)

        if success:
            return {"id": row_id, "data": row_data}
        else:
            return {"error": "Failed to create row"}, 500

    except Exception as e:
        print(f"Error creating table row: {e}")
        return {"error": str(e)}, 500


@app.patch("/api/workspaces/{workspace_id}/data/{table_id}/{row_id}")
async def update_workspace_table_row(workspace_id: str, table_id: str, row_id: str, request: dict, authorization: Optional[str] = Header(None)):
    """Update an existing row in a table (Supabase)"""
    try:
        # Verify user has access to workspace
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        if table_id not in SCHEMA["tables"]:
            return {"error": "Table not found"}, 404

        # Update row in database
        from supabase_data import add_table_row, get_table_data

        # Support both formats: {data: {...}} or direct field updates
        if "data" in request:
            row_data = request.get("data", {})
        else:
            # Get existing row data and merge updates
            existing_data = get_table_data(workspace_id, table_id)
            existing_row = next((row for row in existing_data if row.get("id") == row_id), None)

            if not existing_row:
                return {"error": "Row not found"}, 404

            row_data = {**existing_row, **request}

        row_data["id"] = row_id  # Ensure ID is preserved

        success = add_table_row(workspace_id, table_id, row_id, row_data)

        if success:
            return {"id": row_id, "data": row_data}
        else:
            return {"error": "Failed to update row"}, 500

    except Exception as e:
        print(f"Error updating table row: {e}")
        return {"error": str(e)}, 500


@app.delete("/api/workspaces/{workspace_id}/data/{table_id}/{row_id}")
async def delete_workspace_table_row(workspace_id: str, table_id: str, row_id: str, authorization: Optional[str] = Header(None)):
    """Delete a row from a table (Supabase)"""
    try:
        # Verify user has access to workspace
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        if table_id not in SCHEMA["tables"]:
            return {"error": "Table not found"}, 404

        # Delete row from database
        from supabase_data import delete_table_row
        success = delete_table_row(workspace_id, table_id, row_id)

        if success:
            return {"success": True, "id": row_id}
        else:
            return {"error": "Failed to delete row"}, 500

    except Exception as e:
        print(f"Error deleting table row: {e}")
        return {"error": str(e)}, 500

@app.get("/api/workspaces/{workspace_id}/schema/tables")
async def get_workspace_tables(workspace_id: str, authorization: Optional[str] = Header(None)):
    """Get table schemas for a workspace (Supabase)"""
    try:
        _, access_error = ensure_workspace_read_access(workspace_id, authorization)
        if access_error:
            return access_error

        table_schemas = get_workspace_schemas(workspace_id, "table")
        schema_source = table_schemas if table_schemas else SCHEMA.get("tables", {})

        tables = []
        for table_id, schema in schema_source.items():
            if not schema:
                continue
            tables.append({
                "id": table_id,
                "displayName": schema.get("displayName", table_id),
                "icon": schema.get("icon", "📄"),
                "columnCount": len(schema.get("columns", []))
            })

        return {"tables": tables}
    except Exception as e:
        print(f"Error getting workspace tables: {e}")
        return {"error": str(e)}, 500

@app.get("/api/workspaces/{workspace_id}/schema/views")
async def get_workspace_views(workspace_id: str, authorization: Optional[str] = Header(None)):
    """Get view schemas for a workspace (Supabase)"""
    try:
        _, access_error = ensure_workspace_read_access(workspace_id, authorization)
        if access_error:
            return access_error

        view_schemas = get_workspace_schemas(workspace_id, "view")
        schema_source = view_schemas if view_schemas else SCHEMA.get("views", {})

        views_by_category = {}
        for view_id, config in schema_source.items():
            if not config:
                continue
            category = config.get("category", "Other")
            if category not in views_by_category:
                views_by_category[category] = []
            views_by_category[category].append({
                "id": view_id,
                "displayName": config.get("displayName", view_id),
                "icon": config.get("icon", "📋")
            })

        return {"viewsByCategory": views_by_category}
    except Exception as e:
        print(f"Error getting workspace views: {e}")
        return {"error": str(e)}, 500

@app.get("/api/workspaces/{workspace_id}/categories")
async def get_workspace_categories_endpoint(workspace_id: str, authorization: Optional[str] = Header(None)):
    """Get categories for a workspace (Supabase)"""
    try:
        # Verify user has access to workspace
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        # Get categories from Supabase
        categories = get_workspace_categories(workspace_id)

        # Build tree structure
        tree = build_category_tree(categories)

        return {
            "categories": categories,
            "tree": tree
        }
    except Exception as e:
        print(f"Error getting workspace categories: {e}")
        return {"error": str(e)}, 500

@app.get("/api/workspaces/{workspace_id}/view/{view_id}")
async def get_workspace_view_data(workspace_id: str, view_id: str, categories: Optional[str] = None, authorization: Optional[str] = Header(None)):
    """Get view data for a workspace (Supabase)"""
    try:
        workspace, access_error = ensure_workspace_read_access(workspace_id, authorization)
        if access_error:
            return access_error

        view_configs = get_workspace_schemas(workspace_id, "view")
        if not view_configs or view_id not in view_configs or not view_configs[view_id]:
            # Fallback to static schema for guest workspaces
            if workspace and workspace.get("created_by") is None and view_id in SCHEMA.get("views", {}):
                view_config = SCHEMA["views"][view_id]
            else:
                return {"error": "View not found"}, 404
        else:
            view_config = view_configs[view_id]

        table_id = view_config.get("sourceTable") or view_config.get("tableId")

        if not table_id:
            return {"error": "View has no table reference"}, 400

        # Get category IDs if filtering requested
        category_ids = categories.split(",") if categories else None

        # Get data from the base table
        data = get_table_data(workspace_id, table_id, category_ids)

        # Apply view-specific filtering if exists
        view_filters = view_config.get("filters", [])
        if view_filters:
            # Apply each filter with operator support
            for filter_rule in view_filters:
                field = filter_rule.get("field")
                operator = filter_rule.get("operator", "eq")
                value = filter_rule.get("value")

                if operator == "eq":
                    data = [item for item in data if item.get(field) == value]
                elif operator == "in":
                    data = [item for item in data if item.get(field) in value]
                elif operator == "ne":
                    data = [item for item in data if item.get(field) != value]
                elif operator == "gt":
                    data = [item for item in data if item.get(field) and item.get(field) > value]
                elif operator == "lt":
                    data = [item for item in data if item.get(field) and item.get(field) < value]
                elif operator == "gte":
                    data = [item for item in data if item.get(field) and item.get(field) >= value]
                elif operator == "lte":
                    data = [item for item in data if item.get(field) and item.get(field) <= value]
                elif operator == "contains":
                    data = [item for item in data if item.get(field) and value in str(item.get(field))]
                elif operator == "within":
                    # For date ranges (e.g., within 7 days)
                    from datetime import datetime, timedelta
                    today = datetime.now().date()
                    target_date = today + timedelta(days=value)
                    data = [item for item in data if item.get(field) and
                           datetime.fromisoformat(item.get(field)).date() <= target_date]

        return {
            "view_id": view_id,
            "config": view_config,
            "data": data
        }
    except Exception as e:
        print(f"Error getting workspace view data: {e}")
        return {"error": str(e)}, 500

# Legacy project endpoint (backwards compatibility)
@app.get("/api/projects/{project_id}/data/{table_id}")
async def get_project_table_data(project_id: str, table_id: str, categories: Optional[str] = None, workspace: Optional[str] = None):
    """Get all data for a specific table in a project (with optional category and workspace filtering)"""
    if table_id not in SCHEMA["tables"]:
        return {"error": "Table not found"}, 404

    data = load_table_data(table_id, project_id)

    # Apply workspace filtering if requested
    if workspace:
        data = [item for item in data if item.get("workspace_id") == workspace]

    # Apply category filtering if requested
    if categories:
        category_ids = categories.split(",")

        # Load project categories
        project_dir = Path(__file__).parent / "projects" / project_id
        categories_path = project_dir / "categories.json"

        if categories_path.exists():
            with open(categories_path, "r") as f:
                all_categories = json.load(f)
        else:
            all_categories = SCHEMA.get("default_categories", [])

        # Filter data with cascade
        data = filter_data_by_categories(data, category_ids, all_categories)

    return {
        "table_id": table_id,
        "schema": SCHEMA["tables"][table_id],
        "data": data
    }

@app.get("/api/projects/{project_id}/view/{view_id}")
async def get_project_view_data(project_id: str, view_id: str, categories: Optional[str] = None, workspace: Optional[str] = None):
    """Get data for a specific view with filters applied in a project (with optional category and workspace filtering)"""
    if view_id not in SCHEMA["views"]:
        return {"error": "View not found"}, 404

    view_config = SCHEMA["views"][view_id]

    # Load data from source table(s)
    if "sourceTable" in view_config:
        data = load_table_data(view_config["sourceTable"], project_id)
        source_tables = [view_config["sourceTable"]]
    elif "sourceTables" in view_config:
        # For now, load from first table (can be enhanced for joins)
        source_tables = view_config["sourceTables"]
        data = load_table_data(source_tables[0], project_id)
    else:
        data = []
        source_tables = []

    # Apply workspace filtering FIRST (before category and view filters)
    if workspace:
        data = [item for item in data if item.get("workspace_id") == workspace]

    # Apply category filtering SECOND (before view filters)
    if categories:
        category_ids = categories.split(",")

        # Load project categories
        project_dir = Path(__file__).parent / "projects" / project_id
        categories_path = project_dir / "categories.json"

        if categories_path.exists():
            with open(categories_path, "r") as f:
                all_categories = json.load(f)
        else:
            all_categories = SCHEMA.get("default_categories", [])

        # Filter data with cascade
        data = filter_data_by_categories(data, category_ids, all_categories)

    # Apply filters
    if "filters" in view_config:
        from datetime import datetime
        filtered_data = []
        for item in data:
            matches = True
            for filter_rule in view_config["filters"]:
                field = filter_rule.get("field")
                operator = filter_rule.get("operator")
                value = filter_rule.get("value")

                if field not in item:
                    continue

                item_value = item[field]

                # Handle different operators
                if operator == "eq":
                    if value == "today":
                        today = datetime.now().date().isoformat()
                        matches = matches and (item_value == today)
                    else:
                        matches = matches and (item_value == value)

                elif operator == "in":
                    matches = matches and (item_value in value)

                elif operator == "ne":
                    matches = matches and (item_value != value)

                elif operator == "within":
                    # For date fields, check if within N days
                    if isinstance(value, int) and item_value:
                        try:
                            item_date = datetime.fromisoformat(str(item_value)).date()
                            today = datetime.now().date()
                            days_diff = (item_date - today).days
                            matches = matches and (0 <= days_diff <= value)
                        except:
                            matches = False

            if matches:
                filtered_data.append(item)
        data = filtered_data

    return {
        "view_id": view_id,
        "schema": view_config,
        "source_tables": source_tables,
        "data": data
    }

# Initialize Anthropic client
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def get_system_context(planner_type: str = None):
    """Build system context with schema and current data summary"""
    planner_context = ""
    if planner_type:
        planner_context = f"\nThe user is currently in the {planner_type.title()} Planner context.\n"

    context = f"""You are an AI assistant for Plain, a life planning system.{planner_context}

# System Schema
The system has the following tables:
{json.dumps({k: v['displayName'] for k, v in SCHEMA['tables'].items()}, indent=2)}

# Available Views
{json.dumps({k: v['displayName'] + ' (' + v['category'] + ')' for k, v in SCHEMA['views'].items()}, indent=2)}

You can help users:
1. Create comprehensive life plans based on their goals and aspirations
2. Query their data (goals, actions, metrics, etc.)
3. Update existing records
4. Create new records
5. Analyze their progress and provide insights
6. Answer questions about their planning system

IMPORTANT: When helping users create a new plan, you MUST use the create_plan tool to save their plan data.

When helping users create a plan (food, fitness, finance, career, learning, or life):
1. Have a brief conversation to understand their goals and situation (1-3 exchanges)
2. Based on their input, extract structured data:
   - Goals: What they want to achieve (e.g., "Lose 10 pounds", "Save $5000", "Learn Python")
   - Actions: Specific tasks/habits to reach goals (e.g., "Go to gym 3x/week", "Cook meals at home")
   - Metrics: Measurements to track (e.g., "Weight", "Savings balance", "Workout count")
3. Use the create_plan tool to save this data into their Life OS workspace
4. After creating the plan, confirm what was created and provide next steps

All plans are stored in a single "Life OS" workspace with categories (food, fitness, finance, career, learning, life).
If the workspace already exists, plans are added to it with the appropriate category.
If no workspace exists, one will be created automatically.

Be helpful, concise, and action-oriented. Focus on getting enough information to create a useful plan quickly.
"""
    return context

@app.websocket("/ws/chat/{project_id}")
async def websocket_chat(websocket: WebSocket, project_id: str):
    await websocket.accept()
    conversation_history = []
    planner_type = None

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            user_message = data.get("message", "")

            # Get planner type from first message
            if not planner_type and "plannerType" in data:
                planner_type = data.get("plannerType")

            if not user_message:
                continue

            # Add user message to history
            conversation_history.append({
                "role": "user",
                "content": [{
                    "type": "text",
                    "text": user_message
                }]
            })

            # Get system context with planner type
            system_context = get_system_context(planner_type)

            # Load relevant data based on message content (simple keyword matching for now)
            data_context = ""
            tables_to_check = ["goals", "actions", "metrics", "reviews"]

            for table_id in tables_to_check:
                if table_id in user_message.lower() or any(word in user_message.lower() for word in ["goal", "action", "task", "metric", "review"]):
                    table_data = load_table_data(table_id, project_id)
                    if table_data:
                        data_context += f"\n\n# Current {SCHEMA['tables'][table_id]['displayName']}:\n"
                        data_context += json.dumps(table_data, indent=2)[:2000]  # Limit size
            
            # Create enhanced system message
            full_system_context = system_context + data_context
            
            # Define tool for creating plan data
            tools = [{
                "name": "create_plan",
                "description": "Create a new plan with goals, actions, and metrics. Use this when the user wants to create a plan (food, fitness, finance, career, learning, or life plan). Extract structured data from the conversation and create the plan.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "goals": {
                            "type": "array",
                            "description": "List of goals the user wants to achieve",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "goal": {"type": "string", "description": "The goal description"},
                                    "timeframe": {"type": "string", "enum": ["Annual", "Quarter", "Month", "Week"], "description": "Time period for the goal"},
                                    "priority": {"type": "string", "enum": ["Low", "Med", "High"], "description": "Goal priority"},
                                    "status": {"type": "string", "enum": ["Planned", "Active", "Paused", "Done", "Dropped"], "description": "Current status"}
                                },
                                "required": ["goal"]
                            }
                        },
                        "actions": {
                            "type": "array",
                            "description": "List of specific actions/tasks to achieve the goals",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "action": {"type": "string", "description": "The action description"},
                                    "type": {"type": "string", "enum": ["Project", "Task", "Habit"], "description": "Type of action"},
                                    "status": {"type": "string", "enum": ["Backlog", "Next", "In progress", "Blocked", "Done", "Dropped"], "description": "Current status"},
                                    "priority": {"type": "string", "enum": ["Low", "Med", "High"], "description": "Action priority"}
                                },
                                "required": ["action"]
                            }
                        },
                        "metrics": {
                            "type": "array",
                            "description": "List of metrics to track progress",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "metric_name": {"type": "string", "description": "Name of the metric"},
                                    "unit": {"type": "string", "description": "Unit of measurement (e.g., kg, calories, dollars)"},
                                    "target_year": {"type": "number", "description": "Target value for the year"},
                                    "baseline": {"type": "number", "description": "Starting/baseline value"}
                                },
                                "required": ["metric_name"]
                            }
                        }
                    },
                    "required": ["goals", "actions"]
                }
            }]

            # Call Claude API with tools
            try:
                response = anthropic_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4000,
                    system=full_system_context,
                    messages=conversation_history,
                    tools=tools
                )

                # Process response content
                assistant_text = ""
                tool_uses = []

                for content_block in response.content:
                    if content_block.type == "text":
                        assistant_text += content_block.text
                    elif content_block.type == "tool_use":
                        tool_uses.append(content_block)

                # Send text response to client if any
                if assistant_text:
                    await websocket.send_json({
                        "type": "message",
                        "content": assistant_text
                    })

                # Add assistant response to history
                conversation_history.append({
                    "role": "assistant",
                    "content": response.content
                })

                # Process tool uses (create plan data)
                workspace_id = None
                for tool_use in tool_uses:
                    if tool_use.name == "create_plan":
                        plan_data = tool_use.input

                        # Get or create Life OS workspace
                        workspace_id = get_or_create_life_workspace(user_id=None)  # Guest mode

                        if workspace_id:
                            try:
                                created = create_default_workspace_structure(workspace_id, SCHEMA)
                                if not created:
                                    raise RuntimeError("Failed to create default workspace structure")

                                inserted = insert_plan_data(workspace_id, planner_type or "life", plan_data)
                                if not inserted:
                                    raise RuntimeError("Failed to insert plan data")
                            except Exception as plan_error:
                                print(f"Error creating plan data: {plan_error}")
                                await websocket.send_json({
                                    "type": "error",
                                    "content": f"Plan creation failed: {plan_error}"
                                })
                                workspace_id = None
                                continue

                        summary_text = (
                            f"Plan created successfully with "
                            f"{len(plan_data.get('goals', []))} goals, "
                            f"{len(plan_data.get('actions', []))} actions, and "
                            f"{len(plan_data.get('metrics', []))} metrics. "
                            "You can review everything in the workspace sidebar."
                        )

                        await websocket.send_json({
                            "type": "message",
                            "content": summary_text
                        })

                        conversation_history.append({
                            "role": "assistant",
                            "content": [{
                                "type": "text",
                                "text": summary_text
                            }]
                        })

                # If plan was created, notify client that workspace is ready
                if workspace_id:
                    await websocket.send_json({
                        "type": "workspace_created",
                        "workspaceId": workspace_id,
                        "workspaceName": "Life OS"
                    })
                    print(f"Created plan in workspace: {workspace_id}")
                
            except Exception as e:
                print(f"Error during Claude interaction: {e}")
                try:
                    await websocket.send_json({
                        "type": "error",
                        "content": f"Error calling Claude API: {str(e)}"
                    })
                except Exception as send_error:
                    print(f"Failed to send error over websocket: {send_error}")
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"Server error: {str(e)}"
            })
        except:
            pass
