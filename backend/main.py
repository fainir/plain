from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path
import os
from anthropic import Anthropic
from dotenv import load_dotenv
from category_utils import get_category_descendants, build_category_tree, filter_data_by_categories
from typing import Optional
from supabase_data import (
    get_user_workspaces,
    get_workspace_schemas,
    get_table_data,
    get_workspace_categories,
    get_workspace_by_id,
    create_default_workspace_structure
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
        # Verify user has access to workspace
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        # Get table schemas from Supabase
        table_schemas = get_workspace_schemas(workspace_id, "table")

        # Convert to list format expected by frontend
        tables = []
        for table_id, schema in table_schemas.items():
            if schema:
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
        # Verify user has access to workspace
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        # Get view schemas from Supabase
        view_schemas = get_workspace_schemas(workspace_id, "view")

        # Group by category
        views_by_category = {}
        for view_id, config in view_schemas.items():
            if config:
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
        # Verify user has access to workspace
        if not authorization or not authorization.startswith("Bearer "):
            return {"error": "Unauthorized"}, 401

        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return {"error": "Unauthorized"}, 401

        # Get view config from Supabase
        view_configs = get_workspace_schemas(workspace_id, "view")

        if view_id not in view_configs or not view_configs[view_id]:
            return {"error": "View not found"}, 404

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

When helping users create a new plan:
- Ask clarifying questions about their goals, current situation, and priorities
- Suggest specific, actionable goals and actions
- Create a structured plan with goals, actions, and milestones
- Assign appropriate categories to items (health, finance, career, etc.)

Be helpful, concise, and action-oriented. Use markdown formatting when appropriate.
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
                "content": user_message
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
            
            # Call Claude API
            try:
                response = anthropic_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=2000,
                    system=full_system_context,
                    messages=conversation_history
                )
                
                assistant_message = response.content[0].text

                # Add assistant response to history
                conversation_history.append({
                    "role": "assistant",
                    "content": assistant_message
                })

                # Send response back to client
                await websocket.send_json({
                    "type": "message",
                    "content": assistant_message
                })

                # Check if this is a guest user (project_id starts with 'guest-')
                # and if the conversation suggests creating a workspace
                is_guest = project_id.startswith('guest-')
                should_create_workspace = (
                    is_guest and
                    len(conversation_history) >= 2 and  # At least one exchange
                    any(keyword in user_message.lower() for keyword in [
                        'plan', 'create', 'help me', 'organize', 'track',
                        'goal', 'year', 'month', 'week', 'fitness', 'health',
                        'finance', 'career', 'learning', 'food'
                    ])
                )

                if should_create_workspace:
                    # Create a guest workspace (no user_id required)
                    workspace_name = f"{planner_type.title()} Plan" if planner_type else "Life Plan"
                    workspace_icon = {
                        'life': '🙂',
                        'food': '🍽️',
                        'fitness': '🏋️',
                        'finance': '💰',
                        'career': '💼',
                        'learning': '📚'
                    }.get(planner_type, '⭐')

                    # Insert workspace without user_id (guest workspace)
                    workspace_result = supabase.table("workspaces").insert({
                        "name": workspace_name,
                        "icon": workspace_icon,
                        "description": f"AI-generated {workspace_name.lower()}"
                    }).execute()

                    if workspace_result.data:
                        workspace_id = workspace_result.data[0]['id']

                        # Create default schema for this workspace
                        create_default_workspace_structure(workspace_id)

                        # Notify client that workspace was created
                        await websocket.send_json({
                            "type": "workspace_created",
                            "workspaceId": workspace_id,
                            "workspaceName": workspace_name
                        })

                        print(f"Created guest workspace: {workspace_id}")
                
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "content": f"Error calling Claude API: {str(e)}"
                })
                
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
