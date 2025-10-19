'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  children?: Category[];
}

interface CategoryFilterProps {
  projectId?: string;
  workspaceId?: string;
  selectedCategories: string[];
  onCategoryChange: (categoryIds: string[]) => void;
}

export default function CategoryFilter({ projectId, workspaceId, selectedCategories, onCategoryChange }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        let url: string;
        let headers: any = {};

        // Use workspace endpoint if workspaceId provided, otherwise use legacy project endpoint
        if (workspaceId && session) {
          url = `http://localhost:8000/api/workspaces/${workspaceId}/categories`;
          headers = { 'Authorization': `Bearer ${session.access_token}` };
        } else if (projectId) {
          url = `http://localhost:8000/api/projects/${projectId}/categories`;
        } else {
          return;
        }

        const response = await fetch(url, { headers });
        const data = await response.json();

        setCategories(data.categories || []);
        setCategoryTree(data.tree || []);

        // Auto-expand all categories by default
        const allIds = new Set((data.categories || []).map((c: Category) => c.id));
        setExpandedCategories(allIds);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, [projectId, workspaceId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategory = (categoryId: string) => {
    const newSelected = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];

    onCategoryChange(newSelected);
  };

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const selectAll = () => {
    onCategoryChange(categories.map(c => c.id));
  };

  const clearAll = () => {
    onCategoryChange([]);
  };

  const renderCategoryNode = (category: Category, level: number = 0) => {
    const isSelected = selectedCategories.includes(category.id);
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {/* Expand/Collapse Arrow */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(category.id);
              }}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 w-4 h-4 flex items-center justify-center"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleCategory(category.id)}
            className="w-3.5 h-3.5 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Icon */}
          <span className="text-base">{category.icon}</span>

          {/* Name */}
          <span className="flex-1 text-sm">
            {category.name}
          </span>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getSelectedText = () => {
    if (selectedCategories.length === 0) return 'No filters';
    if (selectedCategories.length === categories.length) return 'All categories';

    const selectedNames = selectedCategories
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean);

    if (selectedNames.length <= 2) {
      return selectedNames.join(', ');
    }

    return `${selectedNames.length} categories`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
      >
        <span className="text-gray-700 dark:text-gray-300">Filter:</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{getSelectedText()}</span>
        <span className="text-gray-500 ml-1">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {/* Header with actions */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Categories</span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                All
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Category Tree */}
          <div className="max-h-96 overflow-y-auto p-2">
            {categoryTree.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No categories</p>
            ) : (
              categoryTree.map(category => renderCategoryNode(category, 0))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
