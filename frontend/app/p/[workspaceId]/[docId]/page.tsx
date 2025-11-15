'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import FileExplorer from '@/components/FileExplorer';
import DataViewer from '@/components/DataViewer';
import AIChat from '@/components/AIChat';
import { supabase } from '@/lib/supabase/client';
import { useGuestWorkspaceAssociation } from '@/hooks/useGuestWorkspaceAssociation';

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const docId = params.docId as string;

  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [docType, setDocType] = useState<'table' | 'view'>('view');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setSelectedWorkspace(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
      if (!session?.user && typeof window !== 'undefined') {
        const stored =
          localStorage.getItem('guest_workspace_id') ||
          localStorage.getItem('plain_guest_plan_workspace');
        if (stored !== workspaceId) {
          localStorage.setItem('plain_guest_plan_workspace', workspaceId);
        }
      }
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authed = !!session?.user;
      setIsAuthenticated(authed);
      if (!authed && typeof window !== 'undefined') {
        localStorage.setItem('plain_guest_plan_workspace', workspaceId);
      }
    });

    return () => subscription.unsubscribe();
  }, [workspaceId]);

  const handleAssociation = useCallback((associatedId: string) => {
    setSelectedWorkspace(associatedId);
    if (associatedId && associatedId !== workspaceId) {
      router.push(`/p/${associatedId}`);
    }
  }, [router, workspaceId]);

  useGuestWorkspaceAssociation(isAuthenticated, { onAssociated: handleAssociation });

  // Determine if docId is a table or view by checking with the API
  useEffect(() => {
    const checkDocType = async () => {
      // Default to 'view', could be enhanced to query the API
      // For now, assume most direct links are to views
      setDocType('view');
    };

    checkDocType();
  }, [docId, workspaceId]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer - File Explorer */}
        <aside
          className={`
            transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800
            ${leftDrawerOpen ? 'w-64' : 'w-0'}
            overflow-hidden
          `}
        >
          <FileExplorer
            projectId={workspaceId}
            selectedWorkspace={selectedWorkspace ?? workspaceId}
            onSelect={(type, id) => {
              // Navigation handled by router
            }}
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

        {/* Main Content - Show selected document */}
        <main className="flex-1 overflow-auto">
          <DataViewer
            projectId={workspaceId}
            type={docType}
            id={docId}
            selectedCategories={selectedCategories}
            selectedWorkspace={selectedWorkspace}
            isAuthenticated={isAuthenticated}
          />
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
          <AIChat projectId={workspaceId} />
        </aside>
      </div>
    </div>
  );
}
