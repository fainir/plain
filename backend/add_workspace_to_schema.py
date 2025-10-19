import json

# Read the current schema
with open('schema.json', 'r') as f:
    schema = json.load(f)

# Add workspace_id column to all tables (after category_id column)
for table_name, table_config in schema['tables'].items():
    columns = table_config['columns']

    # Check if workspace_id already exists
    has_workspace = any(col['name'] == 'workspace_id' for col in columns)

    if not has_workspace:
        # Find the position after category_id
        category_idx = next((i for i, col in enumerate(columns) if col['name'] == 'category_id'), 1)

        # Insert workspace_id after category_id (or after id)
        workspace_column = {
            "name": "workspace_id",
            "type": "string",
            "required": False,
            "description": "Workspace this item belongs to (life, company, etc.)"
        }

        columns.insert(category_idx + 1, workspace_column)

# Write updated schema
with open('schema.json', 'w') as f:
    json.dump(schema, f, indent=2)

print("✅ Schema updated successfully!")
print(f"✅ Added workspace_id to {len(schema['tables'])} tables")
