'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import AuthModal from '@/components/AuthModal';
import FileExplorer from '@/components/FileExplorer';
import DataViewer from '@/components/DataViewer';
import TopBar from '@/components/TopBar';

interface GuestWorkspacePageProps {
  params: {
    workspaceId: string;
  };
}

export default function GuestWorkspacePage({ params }: GuestWorkspacePageProps) {
  const router = useRouter();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);

    // Persist the guest plan to the user's account
    router.push('/auth/persist-plan');
  };

  const openAuthModal = (tab: 'signin' | 'signup' = 'signup') => {
    setAuthDefaultTab(tab);
    setShowAuthModal(true);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Sign-Up Banner */}
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

      {/* Top Bar */}
      <TopBar
        selectedWorkspace={params.workspaceId}
        onToggleLeftDrawer={() => setIsLeftDrawerOpen(!isLeftDrawerOpen)}
        onToggleRightDrawer={() => setIsRightDrawerOpen(!isRightDrawerOpen)}
        isLeftDrawerOpen={isLeftDrawerOpen}
        isRightDrawerOpen={isRightDrawerOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer - File Explorer */}
        {isLeftDrawerOpen && (
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <FileExplorer
              selectedWorkspace={params.workspaceId}
              selectedDoc={selectedDoc}
              onDocumentSelect={setSelectedDoc}
              onWorkspaceChange={() => {}}
            />
          </div>
        )}

        {/* Center - Data Viewer */}
        <div className="flex-1 overflow-hidden">
          <DataViewer
            workspaceId={params.workspaceId}
            documentId={selectedDoc}
          />
        </div>

        {/* Right Drawer - Future: Properties Panel */}
        {isRightDrawerOpen && (
          <div className="w-64 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto p-4">
            <h3 className="font-semibold mb-4">Properties</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Coming soon: Document properties and settings
            </p>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        defaultTab={authDefaultTab}
      />
    </div>
  );
}
