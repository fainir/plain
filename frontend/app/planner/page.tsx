'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface Workspace {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user's workspaces from Supabase
    const fetchWorkspaces = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        setUserEmail(session.user.email || null);

        const response = await fetch('http://localhost:8000/api/workspaces', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        const data = await response.json();
        const allWorkspaces = data.workspaces || [];

        // Sort workspaces: Life Planner first, then others
        const sorted = allWorkspaces.sort((a, b) => {
          if (a.name === 'Life Planner') return -1;
          if (b.name === 'Life Planner') return 1;
          return a.name.localeCompare(b.name);
        });

        setWorkspaces(sorted);
      } catch (err) {
        console.error('Error fetching workspaces:', err);
      }
    };

    fetchWorkspaces();
  }, [router]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const response = await fetch('http://localhost:8000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, category: 'general' })
      });

      const data = await response.json();
      if (data.id) {
        router.push(`/planner/${data.id}`);
      }
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Plain</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Your Workspaces {userEmail && `(${userEmail})`}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/landing"
                className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                ← Back to Home
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Workspaces List */}
        <div className="max-w-2xl mx-auto">
          {workspaces.map(workspace => (
            <Link
              key={workspace.id}
              href={`/planner/${workspace.id}`}
              className="flex items-center justify-between p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all mb-4"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{workspace.icon || '⭐'}</span>
                <h3 className="text-2xl font-semibold">{workspace.name}</h3>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}

          {/* Add Workspace Button */}
          {isCreating ? (
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                  placeholder="Workspace name..."
                  autoFocus
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewProjectName('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">➕</span>
                <h3 className="text-xl font-semibold text-gray-400">Add Workspace</h3>
              </div>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
