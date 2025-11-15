'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TopBar from '@/components/TopBar';
import FileExplorer from '@/components/FileExplorer';
import DocumentViewer from '@/components/DocumentViewer';
import DataViewer from '@/components/DataViewer';
import AIChat from '@/components/AIChat';
import AuthModal from '@/components/AuthModal';
import { supabase } from '@/lib/supabase/client';
import { useGuestWorkspaceAssociation } from '@/hooks/useGuestWorkspaceAssociation';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceId as string;

  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{type: 'table' | 'view', id: string} | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Update selectedWorkspace when workspaceId changes
  useEffect(() => {
    setSelectedWorkspace(workspaceId);
  }, [workspaceId]);

  // Read document from URL on mount/change
  useEffect(() => {
    const docId = searchParams.get('doc');
    const docType = searchParams.get('type');

    if (docId && docType && (docType === 'table' || docType === 'view')) {
      setSelectedItem({ type: docType, id: docId });
    } else if (!docId && !docType) {
      // Default to goals table when no document is specified
      setSelectedItem({ type: 'table', id: 'goals' });
      // Update URL to reflect the default selection
      const newUrl = `/p/${workspaceId}?doc=goals&type=table`;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, workspaceId, router]);

  useEffect(() => {
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authed = !!session?.user;
      setIsAuthenticated(authed);
      if (!authed && typeof window !== 'undefined') {
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
      if (authed) {
        setShowAuthModal(false);
      } else if (typeof window !== 'undefined') {
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

  // Handle item selection and update URL
  const handleSelectItem = (type: 'table' | 'view', id: string) => {
    setSelectedItem({ type, id });

    // Update URL with selected document
    const newUrl = `/p/${workspaceId}?doc=${id}&type=${type}`;
    router.push(newUrl, { scroll: false });
  };

  const openAuthModal = (tab: 'signin' | 'signup' = 'signup') => {
    setAuthDefaultTab(tab);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    router.push(`/p/${workspaceId}`);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {!isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl">🎉</div>
                <div>
                  <h3 className="font-bold text-lg">Your Plan is Ready!</h3>
                  <p className="text-white/90 text-sm">Sign up now to save your progress and never lose your work</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Sign Up Free
                </button>
                <button
                  onClick={() => openAuthModal('signin')}
                  className="px-6 py-3 bg-transparent text-white rounded-lg hover:bg-white/10 transition-colors font-medium border-2 border-white/30"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            projectId={workspaceId}
            selectedWorkspace={selectedWorkspace ?? workspaceId}
            onSelect={handleSelectItem}
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
              projectId={workspaceId}
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
          <AIChat projectId={workspaceId} />
        </aside>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        defaultTab={authDefaultTab}
      />
    </div>
  );
}
