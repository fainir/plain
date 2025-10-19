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
            supabase.table("table_schemas").insert(table_schemas).execute()

        # 2. Create default view schemas
        view_schemas = []
        for view_id, view_config in schema.get("views", {}).items():
            view_schemas.append({
                "workspace_id": workspace_id,
                "view_id": view_id,
                "config": view_config
            })

        if view_schemas:
            supabase.table("view_schemas").insert(view_schemas).execute()

        # 3. Create default categories
        default_categories = schema.get("default_categories", [])
        categories = []
        for cat in default_categories:
            categories.append({
                "workspace_id": workspace_id,
                "category_id": cat.get("id"),
                "name": cat.get("name"),
                "icon": cat.get("icon"),
                "color": cat.get("color"),
                "parent_id": cat.get("parent_id")
            })

        if categories:
            supabase.table("categories").insert(categories).execute()

        return True
    except Exception as e:
        print(f"Error creating default workspace structure: {e}")
        return False
