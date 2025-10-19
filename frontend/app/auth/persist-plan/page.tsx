'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getGuestPlan } from '@/hooks/useAIChat';

export default function PersistPlanPage() {
  const [status, setStatus] = useState<'checking' | 'persisting' | 'redirecting' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function handlePersistence() {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // Check if there's a guest plan in localStorage
        const guestPlan = getGuestPlan();

        // If no guest plan, just redirect to home
        if (!guestPlan || !guestPlan.messages || guestPlan.messages.length === 0) {
          setStatus('redirecting');
          router.push('/');
          return;
        }

        // Persist the guest plan
        setStatus('persisting');

        const response = await fetch('http://localhost:8000/api/workspaces/persist-guest-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            plannerType: guestPlan.plannerType,
            messages: guestPlan.messages
          })
        });

        if (!response.ok) {
          throw new Error('Failed to persist guest plan');
        }

        const result = await response.json();
        const workspaceId = result.workspace.id;

        // Clear the guest plan from localStorage
        localStorage.removeItem('plain_guest_plan');

        // Redirect to the new workspace
        setStatus('redirecting');
        router.push(`/p/${workspaceId}`);
      } catch (err) {
        console.error('Error persisting guest plan:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');

        // Redirect to home after 3 seconds even if there's an error
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    }

    handlePersistence();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {status === 'checking' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2 dark:text-white">Checking for saved plans...</h2>
            <p className="text-gray-600 dark:text-gray-400">Please wait</p>
          </div>
        )}

        {status === 'persisting' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2 dark:text-white">Creating your workspace...</h2>
            <p className="text-gray-600 dark:text-gray-400">Saving your plan to your account</p>
          </div>
        )}

        {status === 'redirecting' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2 dark:text-white">Success!</h2>
            <p className="text-gray-600 dark:text-gray-400">Redirecting you to your workspace...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="rounded-full h-12 w-12 bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 dark:text-red-300 text-2xl">✕</span>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">Error</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Something went wrong'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Redirecting to home...</p>
          </div>
        )}
      </div>
    </div>
  );
}
