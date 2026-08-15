import { supabase } from '../lib/supabase';

/**
 * Fetch wrapper for the app's own /api endpoints.
 * Attaches the current Supabase session token so the server can authenticate
 * the request (all API routes require a valid session).
 */
export const apiRequest = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(path, { ...options, headers });
};
