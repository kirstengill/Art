import type { Request, Response, NextFunction } from 'express';
import {
  getSupabaseAuthClient,
  getSupabaseDataClient,
  type SupabaseDataClient,
  verifySupabaseAccessToken,
} from '../lib/supabase-server.ts';

interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  user_metadata: Record<string, unknown>;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  supabase?: SupabaseDataClient;
}

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!req.user || !req.supabase) {
    res.status(401).json({ error: 'An authenticated Supabase session is required.' });
    return;
  }

  try {
    const { data: profile, error } = await req.supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.uid)
      .maybeSingle();
    if (error) {
      console.error('Unable to verify administrator role from the Supabase profile.');
      res.status(503).json({ error: 'Unable to verify administrator access.' });
      return;
    }
    if (profile?.role !== 'admin') {
      res.status(403).json({ error: 'Administrator access is required.' });
      return;
    }
    next();
  } catch {
    console.error('Administrator role verification failed.');
    res.status(503).json({ error: 'Unable to verify administrator access.' });
  }
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
    return;
  }
  try {
    if (!getSupabaseAuthClient()) {
      res.status(503).json({ error: 'Supabase Auth is not configured on the server.' });
      return;
    }
    const user = await verifySupabaseAccessToken(token);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired access token.' });
      return;
    }
    req.user = user;
    req.supabase = getSupabaseDataClient(token);
    next();
  } catch (error) {
    if (error instanceof Error && error.message.includes('not configured')) {
      res.status(503).json({ error: error.message });
      return;
    }
    console.error('Supabase access token verification failed.');
    res.status(503).json({ error: 'Unable to verify access token with Supabase Auth.' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    try {
      req.supabase = getSupabaseDataClient();
    } catch (error) {
      console.error('Supabase public database client is not configured:', error);
    }
    next();
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    if (!token) throw new Error('Empty optional bearer token.');
    const user = await verifySupabaseAccessToken(token);
    if (user) {
      req.user = user;
      req.supabase = getSupabaseDataClient(token);
    } else {
      req.supabase = getSupabaseDataClient();
    }
  } catch (error) {
    console.warn('Optional Supabase authentication could not be verified:', error);
    try {
      req.supabase = getSupabaseDataClient();
    } catch (clientError) {
      console.error('Supabase public database client is not configured:', clientError);
    }
  }
  next();
};
