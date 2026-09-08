import {
  isAuthError,
  isAuthSessionMissingError,
  type AuthError,
} from '@supabase/supabase-js';

import { getAuthenticatedClient } from '@/shared/lib/supabase/server';

const INVALID_SESSION_CODES = new Set([
  'bad_jwt',
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'user_not_found',
]);

const isGuestSession = (error: AuthError) =>
  isAuthSessionMissingError(error) ||
  (error.code !== undefined && INVALID_SESSION_CODES.has(error.code));

const getHomeAuth = async () => {
  try {
    const { user, error } = await getAuthenticatedClient();

    if (error) {
      return { userId: null, isError: !isGuestSession(error) };
    }

    return { userId: user?.id ?? null, isError: false };
  } catch (error) {
    // Only auth failures are recoverable here; preserve framework control flow.
    if (!isAuthError(error)) throw error;

    return { userId: null, isError: !isGuestSession(error) };
  }
};

export { getHomeAuth };
