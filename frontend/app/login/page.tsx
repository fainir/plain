'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [redirectUrl, setRedirectUrl] = useState('http://localhost:3000/auth/callback');

  // Set redirect URL on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const redirectedFrom = searchParams.get('redirectedFrom');
      const baseUrl = `${window.location.origin}/auth/callback`;
      if (redirectedFrom) {
        setRedirectUrl(`${baseUrl}?next=${encodeURIComponent(redirectedFrom)}`);
      } else {
        setRedirectUrl(baseUrl);
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to Plain
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account or create a new one
          </p>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                  },
                },
              },
            }}
            providers={[]}
            redirectTo={redirectUrl}
            onlyThirdPartyProviders={false}
          />
        </div>
      </div>
    </div>
  );
}
