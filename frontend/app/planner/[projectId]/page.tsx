'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import FileExplorer from '@/components/FileExplorer';
import DocumentViewer from '@/components/DocumentViewer';
import DataViewer from '@/components/DataViewer';
import AIChat from '@/components/AIChat';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function PlannerPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{type: 'table' | 'view', id: string} | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer - File Explorer with Workspace & Category Filter */}
        <aside
          className={`
            transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800
            ${leftDrawerOpen ? 'w-64' : 'w-0'}
            overflow-hidden
          `}
        >
          <FileExplorer
            projectId={projectId}
            onSelect={(type, id) => setSelectedItem({type, id})}
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            onWorkspaceChange={setSelectedWorkspace}
            isAuthenticated={isAuthenticated}
          />
        </aside>

        {/* Toggle Button for Left Drawer */}
        <button
          onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
          className="absolute left-0 top-32 z-10 bg-gray-200 dark:bg-gray-700 p-2 rounded-r-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          style={{ left: leftDrawerOpen ? '256px' : '0px' }}
        >
          {leftDrawerOpen ? '◀' : '▶'}
        </button>

        {/* Main Content - Document Viewer */}
        <main className="flex-1 overflow-auto">
          {selectedItem ? (
            <DataViewer
              projectId={projectId}
              type={selectedItem.type}
              id={selectedItem.id}
              selectedCategories={selectedCategories}
              selectedWorkspace={selectedWorkspace}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <DocumentViewer />
          )}
        </main>

        {/* Toggle Button for Right Drawer */}
        <button
          onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
          className="absolute right-0 top-32 z-10 bg-gray-200 dark:bg-gray-700 p-2 rounded-l-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          style={{ right: rightDrawerOpen ? '384px' : '0px' }}
        >
          {rightDrawerOpen ? '▶' : '◀'}
        </button>

        {/* Right Drawer - AI Chat */}
        <aside
          className={`
            transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-gray-800
            ${rightDrawerOpen ? 'w-96' : 'w-0'}
            overflow-hidden
          `}
        >
          <AIChat projectId={projectId} />
        </aside>
      </div>
    </div>
  );
}
