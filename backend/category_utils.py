"""
Category utility functions for hierarchical filtering
"""

def get_category_descendants(category_id: str, all_categories: list) -> list:
    """
    Recursively get all descendant category IDs (children, grandchildren, etc.)

    Args:
        category_id: The parent category ID
        all_categories: List of all category dicts with 'id' and 'parent_id'

    Returns:
        List of all descendant category IDs including the parent
    """
    descendants = [category_id]

    # Find direct children
    children = [c for c in all_categories if c.get('parent_id') == category_id]

    # Recursively get descendants of each child
    for child in children:
        descendants.extend(get_category_descendants(child['id'], all_categories))
    return descendants


def get_category_ancestors(category_id: str, all_categories: list) -> list:
    """
    Get all ancestor category IDs (parent, grandparent, etc.)

    Args:
        category_id: The child category ID
        all_categories: List of all category dicts with 'id' and 'parent_id'

    Returns:
        List of all ancestor category IDs including the child
    """
    ancestors = [category_id]

    # Find the category
    category = next((c for c in all_categories if c['id'] == category_id), None)

    if category and category.get('parent_id'):
        # Recursively get ancestors
        ancestors.extend(get_category_ancestors(category['parent_id'], all_categories))

    return ancestors


def build_category_tree(categories: list) -> list:
    """
    Build a tree structure from flat category list

    Args:
        categories: Flat list of category dicts

    Returns:
        List of root categories with nested children
    """
    category_map = {c['id']: {**c, 'children': []} for c in categories}
    roots = []

    for category in categories:
        if category.get('parent_id'):
            parent = category_map.get(category['parent_id'])
            if parent:
                parent['children'].append(category_map[category['id']])
        else:
            roots.append(category_map[category['id']])

    return roots


def filter_data_by_categories(data: list, selected_category_ids: list, all_categories: list) -> list:
    """
    Filter data items by selected categories (with cascade to children)

    Args:
        data: List of data items with 'category_id' field
        selected_category_ids: List of selected category IDs
        all_categories: List of all category dicts

    Returns:
        Filtered data list
    """
    if not selected_category_ids:
        # No filter - return all data
        return data

    # Get all descendant IDs for each selected category (cascade)
    all_valid_ids = set()
    for cat_id in selected_category_ids:
        descendants = get_category_descendants(cat_id, all_categories)
        all_valid_ids.update(descendants)

    # Filter data
    filtered = [item for item in data if item.get('category_id') in all_valid_ids]

    return filtered
