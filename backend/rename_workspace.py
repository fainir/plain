from supabase import create_client
import os

# Load environment variables
SUPABASE_URL = "https://bphovukweuiwqwotxmjh.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaG92dWt3ZXVpd3F3b3R4bWpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcyNTM5MywiZXhwIjoyMDc2MzAxMzkzfQ.OnmVxQJAdKk-IKGTyxFypOJKNRYTVCpXs3DVhzS0tN0"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Get all workspaces
result = supabase.table("workspaces").select("*").execute()

print("Current workspaces:")
for workspace in result.data:
    print(f"ID: {workspace['id']}")
    print(f"Name: {workspace['name']}")
    print(f"Icon: {workspace.get('icon', 'None')}")
    print("---")

# Find "My Workspace" and rename it
my_workspace = next((w for w in result.data if w['name'] == 'My Workspace'), None)

if my_workspace:
    print(f"\nRenaming 'My Workspace' (ID: {my_workspace['id']}) to 'Company Planner'...")

    update_result = supabase.table("workspaces").update({
        "name": "Company Planner",
        "icon": "🏢",
        "description": "Company planning and strategy workspace"
    }).eq("id", my_workspace['id']).execute()

    print("✅ Workspace renamed successfully!")
else:
    print("\n'My Workspace' not found")
