'use client';

import { useEffect, useState } from 'react';
import KanbanLayout from './layouts/KanbanLayout';
import CalendarLayout from './layouts/CalendarLayout';
import TimelineLayout from './layouts/TimelineLayout';
import GalleryLayout from './layouts/GalleryLayout';
import ChartLayout from './layouts/ChartLayout';
import HierarchyLayout from './layouts/HierarchyLayout';
import { supabase } from '@/lib/supabase/client';

interface Column {
  name: string;
  type: string;
  primary?: boolean;
  required?: boolean;
}

interface TableSchema {
  displayName: string;
  icon: string;
  columns: Column[];
}

interface ViewSchema {
  displayName: string;
  icon: string;
  category: string;
  sourceTable?: string;
  sourceTables?: string[];
  filters?: any[];
  columns?: string[];
  groupBy?: string;
  layout?: string;
}

interface DataViewerProps {
  projectId: string;
  type: 'table' | 'view';
  id: string;
  selectedCategories?: string[];
  selectedWorkspace?: string | null;
}

export default function DataViewer({ projectId, type, id, selectedCategories, selectedWorkspace }: DataViewerProps) {
  const [schema, setSchema] = useState<TableSchema | ViewSchema | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{rowIndex: number, column: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();

        let endpoint: string;
        let headers: any = {};

        // Use workspace endpoints if workspace is selected and session exists
        if (selectedWorkspace && session) {
          headers = { 'Authorization': `Bearer ${session.access_token}` };

          if (type === 'table') {
            endpoint = `/api/workspaces/${selectedWorkspace}/data/${id}`;
          } else {
            endpoint = `/api/workspaces/${selectedWorkspace}/view/${id}`;
          }

          // Add category filtering if requested
          const params = new URLSearchParams();
          if (selectedCategories && selectedCategories.length > 0) {
            params.append('categories', selectedCategories.join(','));
          }
          if (params.toString()) {
            endpoint += `?${params.toString()}`;
          }
        } else {
          // Fallback to legacy project endpoints
          endpoint = type === 'table' ? `/api/projects/${projectId}/data/${id}` : `/api/projects/${projectId}/view/${id}`;

          const params = new URLSearchParams();
          if (selectedWorkspace) {
            params.append('workspace', selectedWorkspace);
          }
          if (selectedCategories && selectedCategories.length > 0) {
            params.append('categories', selectedCategories.join(','));
          }
          if (params.toString()) {
            endpoint += `?${params.toString()}`;
          }
        }

        const response = await fetch(`http://localhost:8000${endpoint}`, { headers });
        const result = await response.json();

        setSchema(result.schema || result.config);
        setData(result.data || []);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, type, id, selectedCategories, selectedWorkspace]);

  const handleCellClick = (rowIndex: number, column: string, currentValue: any) => {
    // Don't allow editing of ID columns
    if (column === 'id' || column === 'workspace_id') return;

    setEditingCell({ rowIndex, column });
    setEditValue(currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
  };

  const handleCellSave = async () => {
    if (!editingCell || !selectedWorkspace) return;

    const row = data[editingCell.rowIndex];
    const rowId = row.id;

    if (!rowId) {
      setSaveError('Row has no ID');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSaveError('You must be signed in to edit data');
        setSaving(false);
        return;
      }

      // Get the source table for views
      let tableId = id;
      if (type === 'view' && schema && 'sourceTable' in schema) {
        tableId = schema.sourceTable || id;
      }

      const response = await fetch(`http://localhost:8000/api/workspaces/${selectedWorkspace}/data/${tableId}/${rowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          [editingCell.column]: editValue
        })
      });

      if (response.ok) {
        // Update local data
        const newData = [...data];
        newData[editingCell.rowIndex] = {
          ...newData[editingCell.rowIndex],
          [editingCell.column]: editValue
        };
        setData(newData);
        setEditingCell(null);
        setSaveError(null);
      } else {
        const errorData = await response.json();
        setSaveError(errorData.error || 'Failed to update cell');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
    setSaveError(null);
  };

  const handleDeleteRow = async (rowIndex: number) => {
    if (!selectedWorkspace) return;

    const row = data[rowIndex];
    const rowId = row.id;

    if (!rowId || !window.confirm('Delete this row? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be signed in to delete data');
        return;
      }

      // Get the source table for views
      let tableId = id;
      if (type === 'view' && schema && 'sourceTable' in schema) {
        tableId = schema.sourceTable || id;
      }

      const response = await fetch(`http://localhost:8000/api/workspaces/${selectedWorkspace}/data/${tableId}/${rowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        // Remove row from local data
        setData(data.filter((_, index) => index !== rowIndex));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete row');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900 p-8">
        <div className="max-w-md text-center">
          <div className="rounded-full h-16 w-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 dark:text-red-400 text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Data</h3>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900 p-8">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Schema Not Found</h3>
          <p className="text-gray-500 dark:text-gray-400">This table or view doesn't have a schema defined. Please check the configuration.</p>
        </div>
      </div>
    );
  }

  const displayName = schema.displayName;
  const icon = schema.icon;
  const layout = type === 'view' && 'layout' in schema ? schema.layout : 'table';

  // Get columns to display
  let columnsToDisplay: string[] = [];
  if (type === 'table' && 'columns' in schema) {
    columnsToDisplay = schema.columns.map((col: Column) => col.name);
  } else if (type === 'view' && 'columns' in schema && schema.columns && Array.isArray(schema.columns)) {
    // Ensure columns are strings
    columnsToDisplay = schema.columns.filter(col => typeof col === 'string');
  } else if (data.length > 0) {
    // Auto-detect from data
    columnsToDisplay = Object.keys(data[0]);
  }

  // Render different layouts based on view configuration
  const renderLayout = () => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">{icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {type === 'table'
                ? `This table is empty. Start by adding some data or use the AI chat to generate entries.`
                : `This view has no matching data. Try adjusting filters or add data to the source table.`
              }
            </p>
            {type === 'table' && (
              <button
                onClick={() => {/* TODO: Add row creation */}}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Add First Row
              </button>
            )}
          </div>
        </div>
      );
    }

    switch (layout) {
      case 'kanban':
        return <KanbanLayout data={data} schema={schema} />;
      case 'calendar':
        return <CalendarLayout data={data} schema={schema} />;
      case 'timeline':
        return <TimelineLayout data={data} schema={schema} />;
      case 'gallery':
        return <GalleryLayout data={data} schema={schema} />;
      case 'chart':
        return <ChartLayout data={data} schema={schema} />;
      case 'hierarchy':
        return <HierarchyLayout data={data} schema={schema} />;
      default:
        // Default table layout
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  {columnsToDisplay.map(col => (
                    <th
                      key={col}
                      className="text-left p-3 font-semibold text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800"
                    >
                      {String(col).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                  {type === 'table' && (
                    <th className="w-20 p-3 font-semibold text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {columnsToDisplay.map(col => {
                      const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.column === col;
                      const canEdit = type === 'table' && col !== 'id' && col !== 'workspace_id';

                      return (
                        <td key={col} className="p-3 text-sm">
                          {isEditing ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !saving) handleCellSave();
                                    if (e.key === 'Escape') handleCellCancel();
                                  }}
                                  className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                  autoFocus
                                  disabled={saving}
                                />
                                <button
                                  onClick={handleCellSave}
                                  disabled={saving}
                                  className="text-green-600 hover:text-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Save"
                                >
                                  {saving ? '⏳' : '✓'}
                                </button>
                                <button
                                  onClick={handleCellCancel}
                                  disabled={saving}
                                  className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                              {saveError && (
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  {saveError}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              onClick={() => canEdit && handleCellClick(rowIndex, col, row[col])}
                              className={canEdit ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-2 py-1 -mx-2 -my-1' : ''}
                            >
                              {renderCell(row[col])}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {type === 'table' && (
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                          title="Delete row"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-gray-500">
              {type === 'table' ? 'Table' : 'View'} • {data.length} {data.length === 1 ? 'row' : 'rows'}
              {layout !== 'table' && ` • ${layout} layout`}
            </p>
          </div>
        </div>
      </div>

      {/* Data View */}
      <div className="flex-1 overflow-auto">
        {renderLayout()}
      </div>
    </div>
  );
}

function renderCell(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, i) => (
          <span
            key={i}
            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-600' : 'text-red-600'}>
        {value ? '✓' : '✗'}
      </span>
    );
  }

  if (typeof value === 'object') {
    return <span className="text-gray-400">{JSON.stringify(value)}</span>;
  }

  return String(value);
}
