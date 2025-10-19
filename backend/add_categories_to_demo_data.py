import json
import os
from pathlib import Path

# Demo data with suggested category assignments
category_assignments = {
    "life_areas": ["health", "finance", "career"],
    "year_roadmap": [None],  # Roadmap is cross-category
    "goals": ["nutrition", "exercise", "finance", "career"],
    "actions": ["nutrition", "exercise", "finance", "career"],
    "metrics": ["health", "finance"],
    "rules_principles": ["health", "finance"],
    "limits_budgets": ["finance", "health"],
    "risks": ["health", "finance", "career"],
    "decisions": ["career", "finance"],
    "key_dates": ["health", "finance", "career"],
    "resources": ["career", "finance"],
    "playbooks": ["health", "career"],
    "assumptions_hypotheses": ["health", "career"],
    "experiments": ["health", "career"],
    "reviews": [None],  # Reviews are cross-category
    "stakeholders": ["career", "relationships"]
}

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

        # Get category assignments for this table
        categories = category_assignments.get(table_name, [None])

        # Add category_id to each item
        for i, item in enumerate(data):
            # Cycle through categories if we have more items than categories
            category_idx = i % len(categories)
            item["category_id"] = categories[category_idx]

        # Save updated data
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)

        print(f"✅ Updated {table_name} ({len(data)} items)")

print("\n✨ All demo data updated with category_id fields!")
