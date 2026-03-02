'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/apis/api-client';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/login`, // Redirect back to this frontend page
      });
      // Note: The actual redirect happens by the browser, so code below might not run immediately
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
      setLoading(false);
    }
  };

  // Check if we are already logged in (Better Auth session) and try to get App JWT
  // This effect runs when the page loads (e.g., after redirect back from Google)
  const exchangeToken = useCallback(async () => {
    try {
      const session = await authClient.getSession();
      if (session.data) {
        setLoading(true);
        // User is logged in with Better Auth, now exchange for App JWT
        const { accessToken } = await api.auth.getAdminToken();
        localStorage.setItem('app_access_token', accessToken);
        router.push('/'); // Go to dashboard
      }
    } catch (err) {
      console.error('Token exchange failed', err);
      // If exchange fails, maybe we aren't really logged in or not authorized
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    exchangeToken();
  }, [exchangeToken]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Sign in to manage Family Infra</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
          <Button className="w-full" onClick={handleGoogleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
