import json
import os
from pathlib import Path

# Assign different workspaces to different data
# Life planner gets personal categories, Company planner gets business categories
workspace_assignments = {
    "life_areas": ["life", "life", "life"],  # All life
    "year_roadmap": ["life"],  # Life roadmap
    "goals": ["life", "life", "company"],  # Mix of life and company goals
    "actions": ["life", "life", "life", "company", "company", "company"],  # Mix
    "metrics": ["life", "life", "company"],  # Mix
    "rules_principles": ["life", "life", "company"],  # Mix
    "limits_budgets": ["life", "company", "company"],  # Mix
    "risks": ["life", "company"],  # Mix
    "decisions": ["company", "company"],  # Company decisions
    "key_dates": ["life", "life", "company", "company"],  # Mix
    "resources": ["life", "company", "company"],  # Mix
    "playbooks": ["life", "company"],  # Mix
    "assumptions_hypotheses": ["life", "company", "company"],  # Mix
    "experiments": ["life", "company"],  # Mix
    "reviews": ["life", "life"],  # Life reviews
    "stakeholders": ["company", "company", "company"]  # Company stakeholders
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

        # Get workspace assignments for this table
        workspaces = workspace_assignments.get(table_name, ["life"])

        # Add workspace_id to each item
        for i, item in enumerate(data):
            # Cycle through workspaces if we have more items than workspace assignments
            workspace_idx = i % len(workspaces)
            item["workspace_id"] = workspaces[workspace_idx]

        # Save updated data
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)

        print(f"✅ Updated {table_name} ({len(data)} items)")

print("\n✨ All demo data updated with workspace_id fields!")
