"""
Supabase data access layer
Replaces JSON file operations with Supabase queries
"""

from supabase_client import get_supabase_client
from typing import List, Dict, Any, Optional
from category_utils import filter_data_by_categories

supabase = get_supabase_client()


def get_user_workspaces(user_id: str) -> List[Dict[str, Any]]:
    """Get all workspaces for a user"""
    try:
        # Get workspaces where user is a member
        result = supabase.table("workspace_members")\
            .select("workspace_id, workspaces(*)")\
            .eq("user_id", user_id)\
            .execute()

        workspaces = []
        for item in result.data:
            workspace = item.get("workspaces")
            if workspace:
                workspaces.append(workspace)

        return workspaces
    except Exception as e:
        print(f"Error getting workspaces: {e}")
        return []


def get_workspace_schemas(workspace_id: str, schema_type: str = "table") -> Dict[str, Any]:
    """
    Get table or view schemas for a workspace
    schema_type: 'table' or 'view'
    """
    try:
        table_name = "table_schemas" if schema_type == "table" else "view_schemas"
        result = supabase.table(table_name)\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .execute()

        # Convert to dict keyed by table_id/view_id
        schemas = {}
        for item in result.data:
            key = item.get("table_id") if schema_type == "table" else item.get("view_id")
            schemas[key] = item.get("schema") if schema_type == "table" else item.get("config")

        return schemas
    except Exception as e:
        print(f"Error getting {schema_type} schemas: {e}")
        return {}


def get_table_data(workspace_id: str, table_id: str, category_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Get all data for a table in a workspace"""
    try:
        query = supabase.table("table_data")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .eq("table_id", table_id)

        result = query.execute()

        # Extract the data field from each row
        data = [item.get("data", {}) for item in result.data]

        # Apply category filtering if requested
        if category_ids:
            categories = get_workspace_categories(workspace_id)
            data = filter_data_by_categories(data, category_ids, categories)

        return data
    except Exception as e:
        print(f"Error getting table data: {e}")
        return []


def get_workspace_categories(workspace_id: str) -> List[Dict[str, Any]]:
    """Get all categories for a workspace"""
    try:
        result = supabase.table("categories")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .execute()

        # Convert to format expected by category_utils
        categories = []
        for cat in result.data:
            categories.append({
                "id": cat.get("category_id"),
                "name": cat.get("name"),
                "parent_id": cat.get("parent_id"),
                "icon": cat.get("icon"),
                "color": cat.get("color")
            })

        return categories
    except Exception as e:
        print(f"Error getting categories: {e}")
        return []


def create_workspace(user_id: str, name: str, icon: str = "🌟", description: str = "") -> Optional[Dict[str, Any]]:
    """Create a new workspace"""
    try:
        result = supabase.table("workspaces").insert({
            "name": name,
            "icon": icon,
            "description": description,
            "created_by": user_id
        }).execute()

        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error creating workspace: {e}")
        return None


def add_table_row(workspace_id: str, table_id: str, row_id: str, data: Dict[str, Any]) -> bool:
    """Add or update a row in a table"""
    try:
        supabase.table("table_data").upsert({
            "workspace_id": workspace_id,
            "table_id": table_id,
            "row_id": row_id,
            "data": data
        }, on_conflict="workspace_id,table_id,row_id").execute()

        return True
    except Exception as e:
        print(f"Error adding table row: {e}")
        return False


def delete_table_row(workspace_id: str, table_id: str, row_id: str) -> bool:
    """Delete a row from a table"""
    try:
        supabase.table("table_data")\
            .delete()\
            .eq("workspace_id", workspace_id)\
            .eq("table_id", table_id)\
            .eq("row_id", row_id)\
            .execute()

        return True
    except Exception as e:
        print(f"Error deleting table row: {e}")
        return False


def get_workspace_by_id(workspace_id: str) -> Optional[Dict[str, Any]]:
    """Get workspace by ID"""
    try:
        result = supabase.table("workspaces")\
            .select("*")\
            .eq("id", workspace_id)\
            .single()\
            .execute()

        return result.data
    except Exception as e:
        print(f"Error getting workspace: {e}")
        return None


def is_user_workspace_member(workspace_id: str, user_id: str) -> bool:
    """Check if a user is a member of a workspace"""
    try:
        result = supabase.table("workspace_members")\
            .select("id")\
            .eq("workspace_id", workspace_id)\
            .eq("user_id", user_id)\
            .limit(1)\
            .execute()
        return bool(result.data)
    except Exception as e:
        print(f"Error checking workspace membership: {e}")
        return False


def create_default_workspace_structure(workspace_id: str, schema: Dict[str, Any]) -> bool:
    """
    Create default tables, views, and categories for a new workspace
    schema: The system schema.json containing default tables and views
    """
    try:
        # 1. Create default table schemas
        table_schemas = []
        for table_id, table_config in schema.get("tables", {}).items():
            table_schemas.append({
                "workspace_id": workspace_id,
                "table_id": table_id,
                "schema": table_config
            })

        if table_schemas:
            supabase.table("table_schemas")\
                .upsert(table_schemas, on_conflict="workspace_id,table_id")\
                .execute()

        # 2. Create default view schemas
        view_schemas = []
        for view_id, view_config in schema.get("views", {}).items():
            view_schemas.append({
                "workspace_id": workspace_id,
                "view_id": view_id,
                "config": view_config
            })

        if view_schemas:
            supabase.table("view_schemas")\
                .upsert(view_schemas, on_conflict="workspace_id,view_id")\
                .execute()

        # 3. Skip creating default categories
        # Categories will be created as needed when AI generates plan content
        # The database schema for categories may differ from the default_categories structure

        return True
    except Exception as e:
        print(f"Error creating default workspace structure: {e}")
        return False


def insert_plan_data(workspace_id: str, category: str, plan_data: Dict[str, Any]) -> bool:
    """
    Insert plan data (goals, actions, metrics) into workspace table_data table

    plan_data structure:
    {
        "goals": [{"goal": "...", "timeframe": "...", ...}],
        "actions": [{"action": "...", "type": "...", ...}],
        "metrics": [{"metric_name": "...", "unit": "...", ...}]
    }
    """
    try:
        import uuid

        inserted_count = {
            "goals": 0,
            "actions": 0,
            "metrics": 0
        }

        # Insert goals into table_data
        if plan_data.get("goals"):
            for goal in plan_data["goals"]:
                row_id = str(uuid.uuid4())
                goal_data = {
                    "category_id": category,
                    **goal
                }

                supabase.table("table_data").insert({
                    "workspace_id": workspace_id,
                    "table_id": "goals",
                    "row_id": row_id,
                    "data": goal_data
                }).execute()
                inserted_count["goals"] += 1

        # Insert actions into table_data
        if plan_data.get("actions"):
            for action in plan_data["actions"]:
                row_id = str(uuid.uuid4())
                action_data = {
                    "category_id": category,
                    **action
                }

                supabase.table("table_data").insert({
                    "workspace_id": workspace_id,
                    "table_id": "actions",
                    "row_id": row_id,
                    "data": action_data
                }).execute()
                inserted_count["actions"] += 1

        # Insert metrics into table_data
        if plan_data.get("metrics"):
            for metric in plan_data["metrics"]:
                row_id = str(uuid.uuid4())
                metric_data = {
                    "category_id": category,
                    **metric
                }

                supabase.table("table_data").insert({
                    "workspace_id": workspace_id,
                    "table_id": "metrics",
                    "row_id": row_id,
                    "data": metric_data
                }).execute()
                inserted_count["metrics"] += 1

        print(f"Inserted plan data: {inserted_count['goals']} goals, {inserted_count['actions']} actions, {inserted_count['metrics']} metrics")
        return True
    except Exception as e:
        print(f"Error inserting plan data: {e}")
        return False


def get_or_create_life_workspace(user_id: str = None) -> Optional[str]:
    """
    Get existing Life OS workspace or create a new one
    Returns workspace_id
    """
    try:
        # Check if workspace already exists
        if user_id:
            # For authenticated users, check their workspaces
            result = supabase.table("workspace_members")\
                .select("workspace_id, workspaces(id, name)")\
                .eq("user_id", user_id)\
                .execute()

            for item in result.data:
                workspace = item.get("workspaces")
                if workspace and "Life" in workspace.get("name", ""):
                    return workspace["id"]

        # Create new workspace if none exists
        workspace_result = supabase.table("workspaces").insert({
            "name": "Life OS",
            "icon": "🌟",
            "description": "Your life planning workspace",
            "created_by": user_id
        }).execute()

        if workspace_result.data:
            workspace_id = workspace_result.data[0]['id']

            # Add user as workspace member if authenticated
            if user_id:
                supabase.table("workspace_members").insert({
                    "workspace_id": workspace_id,
                    "user_id": user_id,
                    "role": "owner"
                }).execute()

            return workspace_id

        return None
    except Exception as e:
        print(f"Error getting/creating workspace: {e}")
        return None
