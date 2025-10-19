from supabase import create_client

# Load environment variables
SUPABASE_URL = "https://bphovukweuiwqwotxmjh.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaG92dWt3ZXVpd3F3b3R4bWpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcyNTM5MywiZXhwIjoyMDc2MzAxMzkzfQ.OnmVxQJAdKk-IKGTyxFypOJKNRYTVCpXs3DVhzS0tN0"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Update Life Planner icon
result = supabase.table("workspaces").update({
    "icon": "🌿"  # Better icon for life planner - plant/growth/nature
}).eq("name", "Life Planner").execute()

print("✅ Life Planner icon updated to 🌿")
