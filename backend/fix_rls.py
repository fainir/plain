#!/usr/bin/env python3
"""
Fix RLS policies for workspace_members table
"""
from supabase_client import get_supabase_client

supabase = get_supabase_client()

# Disable RLS on workspace_members table
sql = "ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;"

try:
    result = supabase.rpc('exec_sql', {'query': sql}).execute()
    print("Successfully disabled RLS on workspace_members")
    print(result)
except Exception as e:
    print(f"Error: {e}")
    print("\nTrying alternative approach...")

    # Alternative: Drop all policies on workspace_members
    try:
        # Get all policies on workspace_members
        policies_result = supabase.rpc('get_policies', {'table_name': 'workspace_members'}).execute()
        print(f"Found policies: {policies_result}")
    except Exception as e2:
        print(f"Alternative also failed: {e2}")
        print("\nYou need to fix this in the Supabase dashboard:")
        print("1. Go to https://bphovukweuiwqwotxmjh.supabase.co")
        print("2. Navigate to Database → Policies")
        print("3. Find workspace_members table")
        print("4. Either disable RLS or fix the recursive policy")
