'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import CategoryFilter from './CategoryFilter';
import WorkspaceSettings from './WorkspaceSettings';
import { supabase } from '@/lib/supabase/client';
import { getAccessToken } from '@/lib/supabase/getAccessToken';

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
  projectId?: string;
  selectedWorkspace?: string | null;
  selectedDoc?: string | null;
  onDocumentSelect?: (docId: string | null) => void;
  onSelect?: (type: 'table' | 'view', id: string) => void;
  selectedCategories?: string[];
  onCategoryChange?: (categoryIds: string[]) => void;
  onWorkspaceChange?: (workspaceId: string | null) => void;
  isAuthenticated?: boolean;
}

export default function FileExplorer({
  projectId,
  selectedWorkspace: selectedWorkspaceProp,
  selectedDoc,
  onDocumentSelect,
  onSelect,
  selectedCategories = [],
  onCategoryChange = () => {},
  onWorkspaceChange,
  isAuthenticated = false
}: FileExplorerProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [viewsByCategory, setViewsByCategory] = useState<ViewsByCategory>({});
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(selectedWorkspaceProp || null);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    tables: true,
    views: true
  });
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsWorkspace, setSettingsWorkspace] = useState<Workspace | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      if (selectedWorkspaceProp) {
        setSelectedWorkspace(selectedWorkspaceProp);
      }

      if (!isAuthenticated) {
        return;
      }

      const token = await getAccessToken({ requireAuth: true });
      if (!token) {
        console.warn('Unable to retrieve access token for workspace fetch');
        return;
      }

      const response = await fetch('http://localhost:8000/api/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.warn('Failed to fetch workspaces');
        return;
      }

      const data = await response.json();

      if (data.workspaces && data.workspaces.length > 0) {
        const sorted = data.workspaces.sort((a: Workspace, b: Workspace) => {
          if (a.name === 'Life Planner') return -1;
          if (b.name === 'Life Planner') return 1;
          return a.name.localeCompare(b.name);
        });

        setWorkspaces(sorted);

        if (!selectedWorkspaceProp) {
          const workspaceToSelect = projectId || sorted[0].id;
          setSelectedWorkspace(workspaceToSelect);
          onWorkspaceChange?.(workspaceToSelect);
        }
      } else {
        console.warn('No workspaces found');
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  }, [isAuthenticated, onWorkspaceChange, projectId, selectedWorkspaceProp]);

  const fetchSchemas = useCallback(async () => {
    if (!selectedWorkspace) return;
    try {
      const headers: any = {};
      const token = await getAccessToken({ requireAuth: isAuthenticated });
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (isAuthenticated) {
        // Authenticated workspaces require a token; try again once auth state changes
        return;
      }

      const tablesRes = await fetch(`http://localhost:8000/api/workspaces/${selectedWorkspace}/schema/tables`, { headers });
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        if (tablesData.tables) {
          setTables(tablesData.tables);
        }
      }

      const viewsRes = await fetch(`http://localhost:8000/api/workspaces/${selectedWorkspace}/schema/views`, { headers });
      if (viewsRes.ok) {
        const viewsData = await viewsRes.json();
        if (viewsData.viewsByCategory) {
          setViewsByCategory(viewsData.viewsByCategory);
          const expanded: {[key: string]: boolean} = {};
          Object.keys(viewsData.viewsByCategory).forEach(cat => expanded[cat] = true);
          setExpandedCategories(expanded);
        }
      }
    } catch (err) {
      console.error('Error fetching schemas:', err);
    }
  }, [isAuthenticated, selectedWorkspace]);

  useEffect(() => {
    fetchWorkspaces();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchWorkspaces();
    });
    const handleGuestAssociated = () => {
      fetchWorkspaces();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('plain:guest-workspace-associated', handleGuestAssociated);
    }
    return () => {
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('plain:guest-workspace-associated', handleGuestAssociated);
      }
    };
  }, [fetchWorkspaces]);

  useEffect(() => {
    fetchSchemas();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchSchemas();
    });
    return () => subscription.unsubscribe();
  }, [fetchSchemas]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({...prev, [section]: !prev[section]}));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({...prev, [category]: !prev[category]}));
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      if (!isAuthenticated) return;

      const token = await getAccessToken({ requireAuth: true });
      if (!token) return;

      const response = await fetch('http://localhost:8000/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
          headers: { 'Authorization': `Bearer ${token}` }
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
      {/* Workspace Selector (Accordion) - Hidden in guest mode */}
      {!selectedWorkspaceProp && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          {workspaces.length === 0 && (
            <div className="p-4 text-gray-500">Loading workspaces...</div>
          )}

          {workspaces.map((workspace) => {
            const isSelected = selectedWorkspace === workspace.id;

            return (
              <div
                key={workspace.id}
                className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              >
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
                        isAuthenticated={isAuthenticated}
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
                        <span className="text-xs text-gray-500">
                          {expandedSections.tables ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedSections.tables && (
                        <div className="px-2 pb-2">
                          {tables.map((table) => {
                            const isTableSelected = selectedDoc === `table:${table.id}`;

                            return (
                              <div
                                key={table.id}
                                onClick={() => {
                                  if (onDocumentSelect) {
                                    onDocumentSelect(`table:${table.id}`);
                                  } else if (onSelect) {
                                    onSelect('table', table.id);
                                  }
                                }}
                                className={`px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer text-sm flex items-center gap-2 ${
                                  isTableSelected ? 'bg-gray-200 dark:bg-gray-600' : ''
                                }`}
                              >
                                <span>{table.icon}</span>
                                <span>{table.displayName}</span>
                              </div>
                            );
                          })}
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
                        <span className="text-xs text-gray-500">
                          {expandedSections.views ? '▼' : '▶'}
                        </span>
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
                                  {views.map((view) => {
                                    const isViewSelected = selectedDoc === `view:${view.id}`;

                                    return (
                                      <div
                                        key={view.id}
                                        onClick={() => {
                                          if (onDocumentSelect) {
                                            onDocumentSelect(`view:${view.id}`);
                                          } else if (onSelect) {
                                            onSelect('view', view.id);
                                          }
                                        }}
                                        className={`px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer text-sm flex items-center gap-2 ${
                                          isViewSelected ? 'bg-gray-200 dark:bg-gray-600' : ''
                                        }`}
                                      >
                                        <span>{view.icon}</span>
                                        <span>{view.displayName}</span>
                                      </div>
                                    );
                                  })}
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
      )}

      {/* Guest Mode: Show Tables/Views Directly */}
      {selectedWorkspaceProp && selectedWorkspace && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <CategoryFilter
              workspaceId={selectedWorkspace}
              selectedCategories={selectedCategories}
              onCategoryChange={onCategoryChange}
              isAuthenticated={isAuthenticated}
            />
          </div>

          {/* Tables Section */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection('tables')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <h3 className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                📊 Tables
              </h3>
              <span className="text-xs text-gray-500">{expandedSections.tables ? '▼' : '▶'}</span>
            </button>
            {expandedSections.tables && (
              <div className="px-2 pb-2">
                {tables.map(table => {
                  const isSelected = selectedDoc === `table:${table.id}`;
                  return (
                    <div
                      key={table.id}
                      onClick={() => {
                        if (onDocumentSelect) {
                          onDocumentSelect(`table:${table.id}`);
                        } else if (onSelect) {
                          onSelect('table', table.id);
                        }
                      }}
                      className={`px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer text-sm flex items-center gap-2 ${isSelected ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
                    >
                      <span>{table.icon}</span>
                      <span>{table.displayName}</span>
                    </div>
                  );
                })}
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
                        {views.map(view => {
                          const isSelected = selectedDoc === `view:${view.id}`;
                          return (
                            <div
                              key={view.id}
                              onClick={() => {
                                if (onDocumentSelect) {
                                  onDocumentSelect(`view:${view.id}`);
                                } else if (onSelect) {
                                  onSelect('view', view.id);
                                }
                              }}
                              className={`px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded cursor-pointer text-sm flex items-center gap-2 ${isSelected ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
                            >
                              <span>{view.icon}</span>
                              <span>{view.displayName}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
