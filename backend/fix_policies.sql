-- Drop all policies on workspace_members table
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON workspace_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON workspace_members;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON workspace_members;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON workspace_members;

-- Disable RLS on workspace_members
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on other tables that might have issues
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_schemas DISABLE ROW LEVEL SECURITY;
ALTER TABLE view_schemas DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
