import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function TestAuth() {
  const { user, session, isAuthenticated, isLoading } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const runTests = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        isAuthenticated,
        isLoading,
        userId: user?.id,
        userEmail: user?.email,
        userMetadata: user?.user_metadata,
        sessionExists: !!session,
        sessionToken: session?.access_token ? 'exists' : 'null',
        localStorage: {},
      };

      // Check localStorage
      const rawKidgarden = localStorage.getItem('kidgarden_session');
      const rawSb = localStorage.getItem('sb-msdekpkycssitwucbopo-auth-token');
      const rawZustand = localStorage.getItem('kidgarden-auth');

      info.localStorage = {
        kidgarden_session: rawKidgarden ? 'exists' : 'null',
        sb_auth_token: rawSb ? 'exists' : 'null',
        zustand_auth: rawZustand ? 'exists' : 'null',
      };

      // Test Supabase connection
      try {
        const { data, error } = await supabase.auth.getSession();
        info.supabaseSession = {
          hasSession: !!data.session,
          error: error?.message || null,
          userId: data.session?.user?.id,
        };
      } catch (e: any) {
        info.supabaseSession = { error: e.message };
      }

      // Test RLS - try to read users table
      try {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email, role')
          .limit(5);
        info.testUsersTable = {
          success: !usersError,
          count: users?.length || 0,
          error: usersError?.message || null,
          data: users,
        };
      } catch (e: any) {
        info.testUsersTable = { error: e.message };
      }

      setDebugInfo(info);
    };

    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Auth Debug Page</h1>

        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Auth State</h2>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
            {JSON.stringify({
              isAuthenticated,
              isLoading,
              userId: user?.id,
              userEmail: user?.email,
              role: user?.user_metadata?.role,
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Debug Info</h2>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Steps:</h3>
          <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
            <li>Copy <code className="bg-yellow-100 px-1 rounded">user?.id</code> from Auth State above</li>
            <li>Go to Supabase Dashboard → Table Editor → users</li>
            <li>Check if this user ID exists in the users table</li>
            <li>If NOT exists: Run the trigger SQL or insert manually</li>
            <li>If EXISTS but still can't access: Check RLS policies</li>
          </ol>
        </div>
      </div>
    </div>
  );
}