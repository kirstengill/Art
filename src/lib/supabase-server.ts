import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseDataClient = SupabaseClient;

interface SupabaseAuthUser {
  uid: string;
  email?: string;
  name?: string;
  user_metadata: Record<string, unknown>;
}

function getProjectUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
}

function getPublishableKey(): string | undefined {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
}

let authClient: SupabaseDataClient | null = null;
let serviceClient: SupabaseDataClient | null = null;

export function getSupabaseAuthClient(): SupabaseDataClient | null {
  const url = getProjectUrl();
  const anonKey = getPublishableKey();
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

export function getSupabaseDataClient(accessToken?: string): SupabaseDataClient {
  const url = getProjectUrl();
  const anonKey = getPublishableKey();
  if (!url || !anonKey) {
    throw new Error('Supabase URL and publishable key are required on the server.');
  }
  return createClient(url, anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function getSupabaseServiceClient(): SupabaseDataClient {
  const url = getProjectUrl();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error(
      'Trusted Supabase server operations require SUPABASE_URL and SUPABASE_SECRET_KEY.'
    );
  }
  if (!serviceClient) {
    serviceClient = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }
  return serviceClient;
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
