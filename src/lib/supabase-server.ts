import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface SupabaseAuthUser {
  uid: string;
  email?: string;
  name?: string;
  user_metadata: Record<string, unknown>;
}

let authClient: SupabaseClient | null = null;

export function getSupabaseAuthClient(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  if (!authClient) {
    authClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }
  return authClient;
}

export async function verifySupabaseAccessToken(
  accessToken: string
): Promise<SupabaseAuthUser | null> {
  const client = getSupabaseAuthClient();
  if (!client) throw new Error('Supabase Auth is not configured on the server.');

  const { data, error } = await client.auth.getUser(accessToken);
  if (error) {
    if (error.status === 400 || error.status === 401 || error.status === 403) return null;
    throw error;
  }
  if (!data.user) return null;

  const metadata = data.user.user_metadata || {};
  const name =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : undefined;

  return {
    uid: data.user.id,
    email: data.user.email,
    name,
    user_metadata: metadata,
  };
}
