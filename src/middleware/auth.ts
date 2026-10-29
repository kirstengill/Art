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

export function isAdminUid(uid: string | undefined): boolean {
  if (!uid) return false;
  return (process.env.ADMIN_UIDS || '')
    .split(',')
    .map((allowedUid) => allowedUid.trim())
    .filter(Boolean)
    .includes(uid);
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  supabase?: SupabaseDataClient;
}

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!(process.env.ADMIN_UIDS || '').split(',').some((uid) => uid.trim())) {
    res.status(503).json({
      error: 'Administrator access is not configured on this server.',
    });
    return;
  }

  if (!isAdminUid(req.user?.uid)) {
    res.status(403).json({ error: 'Administrator access is required.' });
    return;
  }

  next();
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
