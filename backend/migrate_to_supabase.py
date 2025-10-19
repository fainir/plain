"""
Migrate existing JSON-based data to Supabase
This script will:
1. Get the current authenticated user
2. Create a default workspace for the user
3. Import table schemas from schema.json
4. Import view schemas from schema.json
5. Import categories
6. Import all table data
"""

import json
import os
from pathlib import Path
from supabase_client import get_supabase_client

# Initialize Supabase client
supabase = get_supabase_client()

def load_schema():
    """Load the schema.json file"""
    schema_path = Path(__file__).parent / "schema.json"
    with open(schema_path, "r") as f:
        return json.load(f)

def load_json_file(filename):
    """Load a JSON file from the data directory"""
    file_path = Path(__file__).parent / "data" / filename
    if not file_path.exists():
        return []
    with open(file_path, "r") as f:
        return json.load(f)

def create_workspace_for_user(user_id, workspace_name="My Workspace"):
    """Create a workspace for the user"""
    print(f"\n📁 Creating workspace '{workspace_name}'...")

    try:
        result = supabase.table("workspaces").insert({
            "name": workspace_name,
            "icon": "🌟",
            "description": "Default workspace",
            "created_by": user_id
        }).execute()

        workspace = result.data[0]
        print(f"✅ Created workspace: {workspace['id']}")
        return workspace['id']
    except Exception as e:
        print(f"❌ Error creating workspace: {e}")
        # Try to get existing workspace
        result = supabase.table("workspaces").select("*").eq("created_by", user_id).limit(1).execute()
        if result.data:
            print(f"✅ Using existing workspace: {result.data[0]['id']}")
            return result.data[0]['id']
        raise

def import_table_schemas(workspace_id, schema):
    """Import table schemas"""
    print(f"\n📋 Importing table schemas...")

    tables = schema.get("tables", {})
    count = 0

    for table_id, table_schema in tables.items():
        try:
            supabase.table("table_schemas").insert({
                "workspace_id": workspace_id,
                "table_id": table_id,
                "schema": table_schema
            }).execute()
            count += 1
            print(f"  ✅ Imported schema: {table_id}")
        except Exception as e:
            print(f"  ⚠️  Schema {table_id} already exists or error: {e}")

    print(f"✅ Imported {count} table schemas")

def import_view_schemas(workspace_id, schema):
    """Import view schemas"""
    print(f"\n👁️  Importing view schemas...")

    views = schema.get("views", {})
    count = 0

    for view_id, view_config in views.items():
        try:
            supabase.table("view_schemas").insert({
                "workspace_id": workspace_id,
                "view_id": view_id,
                "config": view_config
            }).execute()
            count += 1
            print(f"  ✅ Imported view: {view_id}")
        except Exception as e:
            print(f"  ⚠️  View {view_id} already exists or error: {e}")

    print(f"✅ Imported {count} view schemas")

def import_categories(workspace_id, schema):
    """Import default categories"""
    print(f"\n🏷️  Importing categories...")

    default_categories = schema.get("default_categories", [])
    count = 0

    for category in default_categories:
        try:
            supabase.table("categories").insert({
                "workspace_id": workspace_id,
                "category_id": category.get("id"),
                "name": category.get("name"),
                "parent_id": None,  # We'll handle parent relationships in a second pass
                "icon": category.get("icon"),
                "color": category.get("color")
            }).execute()
            count += 1
            print(f"  ✅ Imported category: {category.get('name')}")
        except Exception as e:
            print(f"  ⚠️  Category {category.get('name')} already exists or error: {e}")

    print(f"✅ Imported {count} categories")

def import_table_data(workspace_id, schema):
    """Import all table data from JSON files"""
    print(f"\n📊 Importing table data...")

    tables = schema.get("tables", {})
    total_rows = 0

    for table_id in tables.keys():
        filename = f"{table_id}.json"
        data = load_json_file(filename)

        if not data:
            print(f"  ⏭️  Skipping {table_id} (no data)")
            continue

        print(f"  📦 Importing {table_id} ({len(data)} rows)...")
        count = 0

        for row in data:
            try:
                row_id = row.get("id", f"{table_id}-{count}")

                supabase.table("table_data").insert({
                    "workspace_id": workspace_id,
                    "table_id": table_id,
                    "row_id": row_id,
                    "data": row
                }).execute()
                count += 1
            except Exception as e:
                print(f"    ⚠️  Error importing row {row_id}: {e}")

        print(f"  ✅ Imported {count}/{len(data)} rows for {table_id}")
        total_rows += count

    print(f"✅ Imported {total_rows} total rows")

def main(user_email=None, workspace_name="My Workspace"):
    """Main migration function"""
    print("=" * 60)
    print("🚀 Starting Supabase Migration")
    print("=" * 60)

    # Load schema
    print("\n📖 Loading schema...")
    schema = load_schema()
    print(f"✅ Loaded schema with {len(schema.get('tables', {}))} tables and {len(schema.get('views', {}))} views")

    # Get or prompt for user email
    if not user_email:
        user_email = input("\n📧 Enter your email (the one you signed up with): ").strip()

    # Get user from Supabase Auth
    print(f"\n👤 Looking up user: {user_email}...")
    try:
        # List all users (requires service role key)
        users_response = supabase.auth.admin.list_users()
        users = users_response

        # Find user by email
        user = None
        for u in users:
            if u.email == user_email:
                user = u
                break

        if not user:
            print(f"❌ User not found: {user_email}")
            print("Make sure you've signed up at http://localhost:3000/login first!")
            return

        user_id = user.id
        print(f"✅ Found user: {user_id}")

    except Exception as e:
        print(f"❌ Error finding user: {e}")
        print("Make sure:")
        print("  1. You've signed up at http://localhost:3000/login")
        print("  2. You've confirmed your email")
        print("  3. SUPABASE_SERVICE_KEY is set correctly in .env")
        return

    # Create workspace
    workspace_id = create_workspace_for_user(user_id, workspace_name)

    # Import everything
    import_table_schemas(workspace_id, schema)
    import_view_schemas(workspace_id, schema)
    import_categories(workspace_id, schema)
    import_table_data(workspace_id, schema)

    print("\n" + "=" * 60)
    print("✨ Migration Complete!")
    print("=" * 60)
    print(f"\n📊 Summary:")
    print(f"  - User: {user_email}")
    print(f"  - Workspace: {workspace_id}")
    print(f"  - Tables: {len(schema.get('tables', {}))}")
    print(f"  - Views: {len(schema.get('views', {}))}")
    print(f"\n🎯 Next: Visit http://localhost:3000 and select your workspace!")

if __name__ == "__main__":
    import sys

    # Optional: pass email as argument
    email = sys.argv[1] if len(sys.argv) > 1 else None
    workspace_name = sys.argv[2] if len(sys.argv) > 2 else "My Workspace"

    main(email, workspace_name)
