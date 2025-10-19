import json
import os
from pathlib import Path

# Map categories to workspaces
# Personal/Life categories
LIFE_CATEGORIES = [
    "health", "nutrition", "exercise",
    "personal_growth", "relationships", "hobbies"
]

# Business/Company categories
COMPANY_CATEGORIES = [
    "career", "finance", "marketing",
    "sales", "operations", "strategy"
]

def get_workspace_for_category(category_id):
    """Determine workspace based on category"""
    if not category_id:
        return "life"  # Default to life if no category

    if category_id in LIFE_CATEGORIES:
        return "life"
    elif category_id in COMPANY_CATEGORIES:
        return "company"
    else:
        # Default to life for unknown categories
        return "life"

data_dir = Path(__file__).parent / "data"

for filename in os.listdir(data_dir):
    if filename.endswith(".json"):
        table_name = filename.replace(".json", "")
        file_path = data_dir / filename

        with open(file_path, "r") as f:
            data = json.load(f)

        if not data:
            print(f"⏭️  Skipping {table_name} (empty)")
            continue

        # Assign workspace based on category_id
        updated_count = 0
        for item in data:
            category_id = item.get("category_id")
            item["workspace_id"] = get_workspace_for_category(category_id)
            updated_count += 1

        # Save updated data
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)

        print(f"✅ Updated {table_name} ({updated_count} items)")

print("\n✨ All demo data updated with workspace_id based on categories!")
