import { useEffect, useRef } from 'react';
import { getAccessToken } from '@/lib/supabase/getAccessToken';

interface GuestWorkspaceAssociationOptions {
  onAssociated?: (workspaceId: string) => void;
}

/**
 * When a guest user signs in we need to migrate the temporary workspace
 * that was created for them into their Supabase account. This hook checks
 * localStorage for a guest workspace ID and, once the user is authenticated,
 * calls the associate endpoint and cleans up the guest markers.
 */
export function useGuestWorkspaceAssociation(
  isAuthenticated: boolean,
  { onAssociated }: GuestWorkspaceAssociationOptions = {}
) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || attemptedRef.current) return;
    if (typeof window === 'undefined') return;

    const guestWorkspaceId =
      localStorage.getItem('guest_workspace_id') ||
      localStorage.getItem('plain_guest_plan_workspace');

    if (!guestWorkspaceId) return;

    attemptedRef.current = true;
    let cancelled = false;

    const associateWorkspace = async () => {
      const token = await getAccessToken({ requireAuth: true });
      if (!token) {
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/api/workspaces/associate-guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ workspaceId: guestWorkspaceId })
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          console.warn('Failed to associate guest workspace', errorPayload);
          return;
        }

        const result = await response.json().catch(() => ({}));
        const associatedId = result?.workspace?.id || guestWorkspaceId;

        if (!cancelled) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('plain:guest-workspace-associated', {
              detail: { workspaceId: associatedId }
            }));
          }
          localStorage.removeItem('guest_workspace_id');
          localStorage.removeItem('plain_guest_plan');
          localStorage.removeItem('plain_guest_plan_workspace');
          onAssociated?.(associatedId);
        }
      } catch (err) {
        console.error('Error associating guest workspace', err);
      }
    };

    associateWorkspace();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, onAssociated]);
}
