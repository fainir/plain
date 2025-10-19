"""
Create a Life Planner workspace with mock data for testing
"""

import json
from pathlib import Path
from supabase_client import get_supabase_client

# Initialize Supabase client
supabase = get_supabase_client()

def get_user_by_email(email):
    """Get user by email"""
    try:
        users_response = supabase.auth.admin.list_users()
        for user in users_response:
            if user.email == email:
                return user
        return None
    except Exception as e:
        print(f"Error getting user: {e}")
        return None

def load_schema():
    """Load the schema.json file"""
    schema_path = Path(__file__).parent / "schema.json"
    with open(schema_path, "r") as f:
        return json.load(f)

def load_demo_data():
    """Load demo data files"""
    data_dir = Path(__file__).parent / "data"
    demo_data = {}

    for json_file in data_dir.glob("*.json"):
        table_id = json_file.stem
        with open(json_file, "r") as f:
            demo_data[table_id] = json.load(f)

    return demo_data

def create_life_workspace(user_email):
    """Create Life Planner workspace with mock data"""

    # Get user
    print(f"\n🔍 Looking for user: {user_email}")
    user = get_user_by_email(user_email)
    if not user:
        print(f"❌ User not found: {user_email}")
        return None

    user_id = user.id
    print(f"✅ Found user: {user_id}")

    # Create workspace
    print(f"\n📁 Creating 'Life Planner' workspace...")
    try:
        result = supabase.table("workspaces").insert({
            "name": "Life Planner",
            "icon": "🌟",
            "description": "Personal life planning and goal tracking",
            "created_by": user_id
        }).execute()

        workspace_id = result.data[0]['id']
        print(f"✅ Created workspace: {workspace_id}")
    except Exception as e:
        print(f"❌ Error creating workspace: {e}")
        return None

    # Load schema and demo data
    schema = load_schema()
    demo_data = load_demo_data()

    # Import table schemas
    print(f"\n📋 Importing table schemas...")
    for table_id, table_schema in schema["tables"].items():
        try:
            supabase.table("table_schemas").insert({
                "workspace_id": workspace_id,
                "table_id": table_id,
                "schema": table_schema
            }).execute()
            print(f"  ✅ {table_id}")
        except Exception as e:
            print(f"  ❌ {table_id}: {e}")

    # Import view schemas
    print(f"\n📊 Importing view schemas...")
    for view_id, view_config in schema["views"].items():
        try:
            supabase.table("view_schemas").insert({
                "workspace_id": workspace_id,
                "view_id": view_id,
                "config": view_config
            }).execute()
            print(f"  ✅ {view_id}")
        except Exception as e:
            print(f"  ❌ {view_id}: {e}")

    # Import categories (only Life-related categories)
    print(f"\n🏷️  Importing categories...")
    life_categories = [
        {
            "id": "health",
            "name": "Health & Fitness",
            "icon": "💪",
            "color": "green",
            "parent_id": None
        },
        {
            "id": "nutrition",
            "name": "Nutrition",
            "icon": "🥗",
            "color": "lime",
            "parent_id": "health"
        },
        {
            "id": "exercise",
            "name": "Exercise",
            "icon": "🏃",
            "color": "teal",
            "parent_id": "health"
        },
        {
            "id": "finance",
            "name": "Finance",
            "icon": "💰",
            "color": "yellow",
            "parent_id": None
        },
        {
            "id": "relationships",
            "name": "Relationships",
            "icon": "❤️",
            "color": "pink",
            "parent_id": None
        },
        {
            "id": "personal_growth",
            "name": "Personal Growth",
            "icon": "🌱",
            "color": "purple",
            "parent_id": None
        }
    ]

    for category in life_categories:
        try:
            supabase.table("categories").insert({
                "workspace_id": workspace_id,
                "category_id": category["id"],
                "name": category["name"],
                "icon": category["icon"],
                "color": category["color"],
                "parent_id": category["parent_id"]
            }).execute()
            print(f"  ✅ {category['name']}")
        except Exception as e:
            print(f"  ❌ {category['name']}: {e}")

    # Import table data (filter by life categories)
    print(f"\n📦 Importing table data...")
    life_category_ids = ["health", "nutrition", "exercise", "finance", "relationships", "personal_growth"]

    total_rows = 0
    for table_id, rows in demo_data.items():
        if table_id not in schema["tables"]:
            continue

        table_rows = 0
        for row in rows:
            # Only import rows with life-related categories
            category_id = row.get("category_id")
            if category_id and category_id not in life_category_ids:
                continue

            # Generate row_id if not present
            row_id = row.get("id") or row.get("name", f"row_{table_rows}")

            try:
                supabase.table("table_data").insert({
                    "workspace_id": workspace_id,
                    "table_id": table_id,
                    "row_id": row_id,
                    "data": row
                }).execute()
                table_rows += 1
                total_rows += 1
            except Exception as e:
                print(f"  ❌ Error inserting row in {table_id}: {e}")

        if table_rows > 0:
            print(f"  ✅ {table_id}: {table_rows} rows")

    print(f"\n✅ Migration complete!")
    print(f"   Workspace ID: {workspace_id}")
    print(f"   Total rows imported: {total_rows}")
    print(f"\n🌐 Test URL: http://localhost:3000/planner/{workspace_id}")

    return workspace_id

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        user_email = sys.argv[1]
    else:
        user_email = "fainir2006@gmail.com"  # Default to your email

    workspace_id = create_life_workspace(user_email)

    if workspace_id:
        print(f"\n✅ Success! Visit: http://localhost:3000/planner/{workspace_id}")
    else:
        print(f"\n❌ Failed to create workspace")
