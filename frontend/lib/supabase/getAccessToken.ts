import { supabase } from './client';

interface GetAccessTokenOptions {
  /**
   * If true, wait longer for Supabase to hydrate the session.
   * Use this when the API call requires authentication (e.g. private workspace requests).
   */
  requireAuth?: boolean;
  /**
   * Maximum time to wait for an access token before giving up.
   * Defaults to 2000ms for guest-friendly calls and 10000ms when requireAuth is true.
   */
  timeoutMs?: number;
}

/**
 * Resolve the current Supabase access token.
 * When the session is still being hydrated (e.g. right after a refresh),
 * we optionally wait for the INITIAL_SESSION event so we don't issue unauthenticated
 * requests for private workspace resources.
 */
export async function getAccessToken(options: GetAccessTokenOptions = {}): Promise<string | null> {
  const { requireAuth = false, timeoutMs } = options;
  const waitMs = timeoutMs ?? (requireAuth ? 10000 : 2000);

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return session.access_token;
  }

  return new Promise((resolve) => {
    let resolved = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (token: string | null, subscription: { unsubscribe: () => void }) => {
      if (!resolved) {
        resolved = true;
        if (timer) clearTimeout(timer);
        subscription.unsubscribe();
        resolve(token);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession?.access_token) {
        finish(newSession.access_token, subscription);
      } else if (requireAuth && event === 'SIGNED_OUT') {
        finish(null, subscription);
      }
    });

    timer = waitMs > 0 ? setTimeout(() => {
      finish(null, subscription);
    }, waitMs) : undefined;
  });
}
