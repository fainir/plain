from supabase import create_client
import uuid
from datetime import datetime, timedelta

SUPABASE_URL = "https://bphovukweuiwqwotxmjh.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaG92dWt3ZXVpd3F3b3R4bWpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcyNTM5MywiZXhwIjoyMDc2MzAxMzkzfQ.OnmVxQJAdKk-IKGTyxFypOJKNRYTVCpXs3DVhzS0tN0"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Get Life Planner workspace
workspace = supabase.table("workspaces").select("*").eq("name", "Life Planner").execute()
workspace_id = workspace.data[0]['id']

print(f"Populating Life Planner (ID: {workspace_id}) with example data...\n")

# Get categories
categories = supabase.table("categories").select("*").eq("workspace_id", workspace_id).execute()
category_map = {cat['name']: cat['id'] for cat in categories.data}

print(f"Categories: {list(category_map.keys())}\n")

# Get tables
tables = supabase.table("table_schemas").select("*").eq("workspace_id", workspace_id).execute()
table_map = {table['id']: table for table in tables.data}

print(f"Found {len(tables.data)} tables\n")

# Helper function to create data
def create_data(table_id, category_id, data):
    """Create a data row"""
    result = supabase.table("table_data").insert({
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "table_id": table_id,
        "category_id": category_id,
        "data": data,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }).execute()
    return result.data[0] if result.data else None

# Find table IDs by their ID (we'll need to match by structure)
# Let's get the table schemas and match them
goals_table = next((t for t in tables.data if 'goal' in str(t).lower()), None)
actions_table = next((t for t in tables.data if 'action' in str(t).lower()), None)

print("Creating comprehensive example data...\n")

# Health & Fitness Category
health_cat_id = category_map.get('Health & Fitness')
if health_cat_id:
    # Find the goals table
    for table in tables.data:
        schema = table.get('schema', {})
        if isinstance(schema, dict):
            columns = schema.get('columns', [])
            column_names = [col.get('id', '') for col in columns if isinstance(col, dict)]

            # Check if this looks like a goals table
            if any('goal' in str(col).lower() for col in column_names):
                print(f"Adding goals to table {table['id']}...")
                create_data(table['id'], health_cat_id, {
                    "title": "Run a Marathon",
                    "description": "Complete a full marathon by end of year",
                    "status": "In Progress",
                    "target_date": (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d"),
                    "progress": 45
                })
                create_data(table['id'], health_cat_id, {
                    "title": "Lose 15 pounds",
                    "description": "Reach target weight of 165 lbs",
                    "status": "In Progress",
                    "target_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
                    "progress": 60
                })

            # Check if this looks like an actions table
            elif any('action' in str(col).lower() or 'task' in str(col).lower() for col in column_names):
                print(f"Adding actions to table {table['id']}...")
                create_data(table['id'], health_cat_id, {
                    "title": "Morning run - 5K",
                    "description": "Daily morning run",
                    "status": "Active",
                    "priority": "High",
                    "due_date": datetime.now().strftime("%Y-%m-%d")
                })
                create_data(table['id'], health_cat_id, {
                    "title": "Gym session - Upper body",
                    "description": "Strength training workout",
                    "status": "Active",
                    "priority": "Medium",
                    "due_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
                })
                create_data(table['id'], health_cat_id, {
                    "title": "Meal prep for week",
                    "description": "Prepare healthy meals for the upcoming week",
                    "status": "Pending",
                    "priority": "High",
                    "due_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
                })

# Finance Category
finance_cat_id = category_map.get('Finance')
if finance_cat_id:
    for table in tables.data:
        schema = table.get('schema', {})
        if isinstance(schema, dict):
            columns = schema.get('columns', [])
            column_names = [col.get('id', '') for col in columns if isinstance(col, dict)]

            if any('goal' in str(col).lower() for col in column_names):
                print(f"Adding finance goals to table {table['id']}...")
                create_data(table['id'], finance_cat_id, {
                    "title": "Save $50,000 for house down payment",
                    "description": "Build savings for first home purchase",
                    "status": "In Progress",
                    "target_date": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
                    "progress": 35
                })
                create_data(table['id'], finance_cat_id, {
                    "title": "Pay off credit card debt",
                    "description": "Eliminate $8,000 in credit card debt",
                    "status": "In Progress",
                    "target_date": (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d"),
                    "progress": 70
                })

            elif any('action' in str(col).lower() or 'task' in str(col).lower() for col in column_names):
                print(f"Adding finance actions to table {table['id']}...")
                create_data(table['id'], finance_cat_id, {
                    "title": "Review monthly budget",
                    "description": "Analyze spending and adjust budget",
                    "status": "Active",
                    "priority": "High",
                    "due_date": datetime.now().strftime("%Y-%m-%d")
                })
                create_data(table['id'], finance_cat_id, {
                    "title": "Transfer $500 to savings",
                    "description": "Monthly savings contribution",
                    "status": "Active",
                    "priority": "High",
                    "due_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
                })

# Relationships Category
relationships_cat_id = category_map.get('Relationships')
if relationships_cat_id:
    for table in tables.data:
        schema = table.get('schema', {})
        if isinstance(schema, dict):
            columns = schema.get('columns', [])
            column_names = [col.get('id', '') for col in columns if isinstance(col, dict)]

            if any('goal' in str(col).lower() for col in column_names):
                print(f"Adding relationship goals to table {table['id']}...")
                create_data(table['id'], relationships_cat_id, {
                    "title": "Weekly date nights",
                    "description": "Strengthen relationship with partner through quality time",
                    "status": "In Progress",
                    "target_date": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
                    "progress": 80
                })

            elif any('action' in str(col).lower() or 'task' in str(col).lower() for col in column_names):
                print(f"Adding relationship actions to table {table['id']}...")
                create_data(table['id'], relationships_cat_id, {
                    "title": "Plan date night this Friday",
                    "description": "Make restaurant reservation",
                    "status": "Active",
                    "priority": "Medium",
                    "due_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
                })
                create_data(table['id'], relationships_cat_id, {
                    "title": "Call mom",
                    "description": "Weekly check-in call",
                    "status": "Active",
                    "priority": "Medium",
                    "due_date": datetime.now().strftime("%Y-%m-%d")
                })

# Personal Growth Category
growth_cat_id = category_map.get('Personal Growth')
if growth_cat_id:
    for table in tables.data:
        schema = table.get('schema', {})
        if isinstance(schema, dict):
            columns = schema.get('columns', [])
            column_names = [col.get('id', '') for col in columns if isinstance(col, dict)]

            if any('goal' in str(col).lower() for col in column_names):
                print(f"Adding personal growth goals to table {table['id']}...")
                create_data(table['id'], growth_cat_id, {
                    "title": "Read 24 books this year",
                    "description": "Read 2 books per month",
                    "status": "In Progress",
                    "target_date": (datetime.now() + timedelta(days=300)).strftime("%Y-%m-%d"),
                    "progress": 50
                })
                create_data(table['id'], growth_cat_id, {
                    "title": "Learn Spanish",
                    "description": "Achieve conversational fluency in Spanish",
                    "status": "In Progress",
                    "target_date": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
                    "progress": 25
                })

            elif any('action' in str(col).lower() or 'task' in str(col).lower() for col in column_names):
                print(f"Adding personal growth actions to table {table['id']}...")
                create_data(table['id'], growth_cat_id, {
                    "title": "30 min Duolingo practice",
                    "description": "Daily Spanish practice",
                    "status": "Active",
                    "priority": "High",
                    "due_date": datetime.now().strftime("%Y-%m-%d")
                })
                create_data(table['id'], growth_cat_id, {
                    "title": "Read 'Atomic Habits' - Chapter 3",
                    "description": "Continue reading current book",
                    "status": "Active",
                    "priority": "Medium",
                    "due_date": datetime.now().strftime("%Y-%m-%d")
                })
                create_data(table['id'], growth_cat_id, {
                    "title": "Meditation - 15 minutes",
                    "description": "Morning mindfulness practice",
                    "status": "Completed",
                    "priority": "High",
                    "due_date": datetime.now().strftime("%Y-%m-%d")
                })

print("\n✅ Life Planner populated with comprehensive example data!")
print("\nYou should now see:")
print("  - Goals across all categories")
print("  - Daily actions and tasks")
print("  - Progress tracking")
print("  - Impactful view data")
EOF
