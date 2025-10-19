import json

# Read the current schema
with open('schema.json', 'r') as f:
    schema = json.load(f)

# Add category_id column to all tables (after id column)
for table_name, table_config in schema['tables'].items():
    columns = table_config['columns']

    # Check if category_id already exists
    has_category = any(col['name'] == 'category_id' for col in columns)

    if not has_category:
        # Insert category_id after the id column
        category_column = {
            "name": "category_id",
            "type": "string",
            "required": False,
            "description": "Category/Plan this item belongs to"
        }

        # Insert after id (position 1)
        columns.insert(1, category_column)

# Add default categories structure
schema['default_categories'] = [
    {
        "id": "health",
        "name": "Health",
        "icon": "💪",
        "color": "green",
        "parent_id": None
    },
    {
        "id": "nutrition",
        "name": "Nutrition",
        "icon": "🍎",
        "color": "emerald",
        "parent_id": "health"
    },
    {
        "id": "exercise",
        "name": "Exercise",
        "icon": "🏃",
        "color": "orange",
        "parent_id": "health"
    },
    {
        "id": "finance",
        "name": "Finance",
        "icon": "💰",
        "color": "blue",
        "parent_id": None
    },
    {
        "id": "career",
        "name": "Career",
        "icon": "📚",
        "color": "purple",
        "parent_id": None
    },
    {
        "id": "relationships",
        "name": "Relationships",
        "icon": "❤️",
        "color": "rose",
        "parent_id": None
    },
    {
        "id": "personal_growth",
        "name": "Personal Growth",
        "icon": "🌱",
        "color": "teal",
        "parent_id": None
    }
]

# Write updated schema
with open('schema.json', 'w') as f:
    json.dump(schema, f, indent=2)

print("✅ Schema updated successfully!")
print(f"✅ Added category_id to {len(schema['tables'])} tables")
print(f"✅ Added {len(schema['default_categories'])} default categories")
