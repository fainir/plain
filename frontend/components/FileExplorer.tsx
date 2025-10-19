'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CategoryFilter from './CategoryFilter';
import WorkspaceSettings from './WorkspaceSettings';
import { supabase } from '@/lib/supabase/client';

interface Table {
  id: string;
  displayName: string;
  icon: string;
  columnCount: number;
}

interface View {
  id: string;
  displayName: string;
  icon: string;
}

interface ViewsByCategory {
  [category: string]: View[];
}

interface Workspace {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

interface FileExplorerProps {
  projectId: string;
  onSelect: (type: 'table' | 'view', id: string) => void;
  selectedCategories: string[];
  onCategoryChange: (categoryIds: string[]) => void;
  onWorkspaceChange?: (workspaceId: string | null) => void;
}

export default function FileExplorer({ projectId, onSelect, selectedCategories, onCategoryChange, onWorkspaceChange }: FileExplorerProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [viewsByCategory, setViewsByCategory] = useState<ViewsByCategory>({});
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    tables: true,
    views: true
  });
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsWorkspace, setSettingsWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    // Fetch workspaces from Supabase
    const fetchWorkspaces = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('No active session');
          return;
        }

        const response = await fetch('http://localhost:8000/api/workspaces', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        const data = await response.json();
        console.log('Fetched workspaces:', data);

        if (data.workspaces && data.workspaces.length > 0) {
          // Sort workspaces: Life Planner first, then others alphabetically
          const sorted = data.workspaces.sort((a: Workspace, b: Workspace) => {
            if (a.name === 'Life Planner') return -1;
            if (b.name === 'Life Planner') return 1;
            return a.name.localeCompare(b.name);
          });

          setWorkspaces(sorted);
          // Use projectId from URL if available, otherwise auto-select first workspace
          const workspaceToSelect = projectId || sorted[0].id;
          setSelectedWorkspace(workspaceToSelect);
          onWorkspaceChange?.(workspaceToSelect);
        } else {
          console.warn('No workspaces found');
        }
      } catch (err) {
        console.error('Error fetching workspaces:', err);
      }
    };

    fetchWorkspaces();
  }, [onWorkspaceChange, projectId]);

  useEffect(() => {
    if (!selectedWorkspace) return;

    const fetchSchemas = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = {
          'Authorization': `Bearer ${session.access_token}`
        };

        // Fetch tables
        const tablesRes = await fetch(`http://localhost:8000/api/workspaces/${selectedWorkspace}/schema/tables`, { headers });
        const tablesData = await tablesRes.json();
        if (tablesData.tables) {
          setTables(tablesData.tables);
        }

        // Fetch views
        const viewsRes = await fetch(`http://localhost:8000/api/workspaces/${selectedWorkspace}/schema/views`, { headers });
        const viewsData = await viewsRes.json();
        if (viewsData.viewsByCategory) {
          setViewsByCategory(viewsData.viewsByCategory);
          // Auto-expand all categories
          const expanded: {[key: string]: boolean} = {};
          Object.keys(viewsData.viewsByCategory).forEach(cat => expanded[cat] = true);
          setExpandedCategories(expanded);
        }
      } catch (err) {
        console.error('Error fetching schemas:', err);
      }
    };

    fetchSchemas();
  }, [selectedWorkspace]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({...prev, [section]: !prev[section]}));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({...prev, [category]: !prev[category]}));
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('http://localhost:8000/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: newWorkspaceName,
          icon: '📁',
          description: ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh workspaces list
        const workspacesResponse = await fetch('http://localhost:8000/api/workspaces', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const workspacesData = await workspacesResponse.json();

        // Sort workspaces: Life Planner first, then others alphabetically
        const sorted = workspacesData.workspaces.sort((a: Workspace, b: Workspace) => {
          if (a.name === 'Life Planner') return -1;
          if (b.name === 'Life Planner') return 1;
          return a.name.localeCompare(b.name);
        });

        setWorkspaces(sorted);
        setNewWorkspaceName('');
        setIsCreatingWorkspace(false);

        // Select the new workspace
        setSelectedWorkspace(data.id);
        onWorkspaceChange?.(data.id);
      }
    } catch (err) {
      console.error('Error creating workspace:', err);
    }
  };

  console.log('Rendering FileExplorer, workspaces:', workspaces);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto flex flex-col">
      {/* Workspace Selector (Accordion) */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        {workspaces.length === 0 && <div className="p-4 text-gray-500">Loading workspaces...</div>}
        {workspaces.map(workspace => {
          const isSelected = selectedWorkspace === workspace.id;
          return (
            <div key={workspace.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Link
                  href={`/p/${workspace.id}`}
                  onClick={() => {
                    const newWorkspace = isSelected ? null : workspace.id;
                    setSelectedWorkspace(newWorkspace);
                    onWorkspaceChange?.(newWorkspace);
                  }}
                  className="flex-1 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{workspace.icon}</span>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {workspace.name}
                    </h2>
                  </div>
                  <span className="text-gray-500">{isSelected ? '▼' : '▶'}</span>
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSettingsWorkspace(workspace);
                    setSettingsOpen(true);
                  }}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Workspace settings"
                >
                  ⚙️
                </button>
              </div>

              {/* Workspace Content */}
              {isSelected && (
                <div className="bg-white dark:bg-gray-800">
                  {/* Category Filter */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <CategoryFilter
                      workspaceId={selectedWorkspace || undefined}
                      selectedCategories={selectedCategories}
                      onCategoryChange={onCategoryChange}
                    />
                  </div>

                  {/* Tables Section */}
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => toggleSection('tables')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <h3 className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                        📁 Tables
                      </h3>
                      <span className="text-xs text-gray-500">{expandedSections.tables ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.tables && (
                      <div className="px-2 pb-2">
                        {tables.map(table => (
                          <div
                            key={table.id}
                            onClick={() => onSelect('table', table.id)}
                            className="px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer text-sm flex items-center gap-2"
                          >
                            <span>{table.icon}</span>
                            <span>{table.displayName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Views Section */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleSection('views')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <h3 className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                        📋 Views
                      </h3>
                      <span className="text-xs text-gray-500">{expandedSections.views ? '▼' : '▶'}</span>
                    </button>
                    {expandedSections.views && (
                      <div className="px-2 pb-2">
                        {Object.entries(viewsByCategory).map(([category, views]) => (
                          <div key={category} className="mb-2">
                            <button
                              type="button"
                              onClick={() => toggleCategory(category)}
                              className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300"
                            >
                              <span>{category}</span>
                              <span>{expandedCategories[category] ? '▼' : '▶'}</span>
                            </button>
                            {expandedCategories[category] && (
                              <div className="ml-2">
                                {views.map(view => (
                                  <div
                                    key={view.id}
                                    onClick={() => onSelect('view', view.id)}
                                    className="px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer text-sm flex items-center gap-2"
                                  >
                                    <span>{view.icon}</span>
                                    <span>{view.displayName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Workspace Button */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          {isCreatingWorkspace ? (
            <div className="p-3">
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWorkspace();
                  if (e.key === 'Escape') {
                    setIsCreatingWorkspace(false);
                    setNewWorkspaceName('');
                  }
                }}
                placeholder="Workspace name..."
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreateWorkspace}
                  disabled={!newWorkspaceName.trim()}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreatingWorkspace(false);
                    setNewWorkspaceName('');
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingWorkspace(true)}
              className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <span className="text-xl">➕</span>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Add Workspace
              </h2>
            </button>
          )}
        </div>
      </div>

      {/* Workspace Settings Modal */}
      {settingsWorkspace && (
        <WorkspaceSettings
          workspaceId={settingsWorkspace.id}
          workspaceName={settingsWorkspace.name}
          workspaceIcon={settingsWorkspace.icon}
          workspaceDescription={settingsWorkspace.description}
          isOpen={settingsOpen}
          onClose={() => {
            setSettingsOpen(false);
            setSettingsWorkspace(null);
          }}
          onUpdate={(updated) => {
            // Update the workspace in the list
            setWorkspaces(workspaces.map(w =>
              w.id === settingsWorkspace.id
                ? { ...w, name: updated.name, icon: updated.icon, description: updated.description }
                : w
            ));
          }}
          onDelete={() => {
            // Remove workspace from list and redirect to home
            setWorkspaces(workspaces.filter(w => w.id !== settingsWorkspace.id));
            if (selectedWorkspace === settingsWorkspace.id) {
              window.location.href = '/';
            }
          }}
        />
      )}
    </div>
  );
}
