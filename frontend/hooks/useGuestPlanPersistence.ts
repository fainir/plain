import { useEffect, useState } from 'react';
import { getGuestPlan } from './useAIChat';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

/**
 * Hook to automatically persist guest plans to the database after authentication
 * Should be used in a top-level component like layout or a dedicated handler
 */
export function useGuestPlanPersistence() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    async function persistGuestPlan() {
      // Check if we're already processing to avoid duplicates
      if (isProcessing) return;

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if there's a guest plan in localStorage
      const guestPlan = getGuestPlan();
      if (!guestPlan || !guestPlan.messages || guestPlan.messages.length === 0) return;

      // Check if we've already processed this plan
      const processedKey = 'plain_guest_plan_processed';
      if (localStorage.getItem(processedKey) === 'true') return;

      setIsProcessing(true);

      try {
        // Send guest plan to backend to create workspace
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

        // Mark plan as processed
        localStorage.setItem(processedKey, 'true');

        // Clear the guest plan from localStorage
        localStorage.removeItem('plain_guest_plan');

        // Redirect to the new workspace
        router.push(`/p/${workspaceId}`);
      } catch (err) {
        console.error('Error persisting guest plan:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsProcessing(false);
      }
    }

    persistGuestPlan();
  }, [supabase, router, isProcessing]);

  return { isProcessing, error };
}
