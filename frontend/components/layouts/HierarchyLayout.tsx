'use client';

import { useState } from 'react';

interface HierarchyLayoutProps {
  data: any[];
  schema: any;
}

interface TreeNode {
  item: any;
  children: TreeNode[];
  level: number;
}

export default function HierarchyLayout({ data, schema }: HierarchyLayoutProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const parentField = schema.parentField || 'parent_id';
  const titleField = schema.titleField || 'name';
  const idField = 'id';

  // Build tree structure
  const buildTree = (): TreeNode[] => {
    const itemMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Initialize all nodes
    data.forEach(item => {
      itemMap.set(item[idField], {
        item,
        children: [],
        level: 0
      });
    });

    // Build parent-child relationships
    data.forEach(item => {
      const node = itemMap.get(item[idField]);
      if (!node) return;

      const parentId = item[parentField];
      if (parentId && itemMap.has(parentId)) {
        const parent = itemMap.get(parentId)!;
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        // Root node
        roots.push(node);
      }
    });

    return roots;
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderNode = (node: TreeNode): React.ReactNode => {
    const nodeId = node.item[idField];
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children.length > 0;
    const indentLevel = node.level * 24;

    return (
      <div key={nodeId}>
        {/* Node item */}
        <div
          className="flex items-start gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
          style={{ paddingLeft: `${indentLevel + 12}px` }}
        >
          {/* Expand/collapse button */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(nodeId)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              <span className="text-gray-400">•</span>
            </div>
          )}

          {/* Node content */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{node.item[titleField]}</div>

            {/* Additional fields */}
            <div className="flex flex-wrap gap-2 mt-1">
              {schema.columns?.slice(1, 4).map((col: string) => {
                const value = node.item[col];
                if (!value || col === titleField) return null;

                return (
                  <span
                    key={col}
                    className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    {String(value)}
                  </span>
                );
              })}
            </div>

            {/* Dependencies indicator */}
            {schema.showDependencies && node.item.depends_on && node.item.depends_on.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                🔗 Depends on {node.item.depends_on.length} {node.item.depends_on.length === 1 ? 'item' : 'items'}
              </div>
            )}
          </div>

          {/* Status badge */}
          {node.item.status && (
            <div className={`text-xs px-2 py-1 rounded ${getStatusColor(node.item.status)}`}>
              {node.item.status}
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  // Auto-expand first level
  if (expandedNodes.size === 0 && tree.length > 0) {
    const firstLevelIds = tree.map(node => node.item[idField]);
    setExpandedNodes(new Set(firstLevelIds));
  }

  return (
    <div className="p-4 overflow-y-auto">
      <div className="max-w-4xl">
        {tree.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No hierarchical data found
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map(node => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('done') || statusLower.includes('completed') || statusLower.includes('active')) {
    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
  }
  if (statusLower.includes('progress')) {
    return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
  }
  if (statusLower.includes('blocked') || statusLower.includes('paused')) {
    return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
  }
  if (statusLower.includes('planned') || statusLower.includes('next') || statusLower.includes('backlog')) {
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  }

  return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
}
