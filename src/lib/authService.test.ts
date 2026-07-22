import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import {
  getLinkedProviders,
  getSession,
  requestPasswordReset,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  subscribeToAuthChanges,
  updatePassword
} from './authService';
import { getSupabaseClient } from './supabaseClient';

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: vi.fn()
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs in and signs up with a normalized email and password', async () => {
    const signInWithPasswordMock = vi.fn().mockResolvedValue({ error: null });
    const signUp = vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null });
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: { signInWithPassword: signInWithPasswordMock, signUp }
    } as never);

    await signInWithPassword('  cook@example.com ', 'secret12');
    await signUpWithPassword('  cook@example.com ', 'secret12');

    expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: 'cook@example.com', password: 'secret12' });
    expect(signUp).toHaveBeenCalledWith({ email: 'cook@example.com', password: 'secret12' });
  });

  it('does not report a duplicate-looking password signup as successful', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(getSupabaseClient).mockResolvedValue({ auth: { signUp } } as never);

    await expect(signUpWithPassword('cook@example.com', 'secret12')).rejects.toThrow(
      'Sign in with your existing method'
    );
  });

  it('starts Google sign-in and password recovery at the current app origin', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: { signInWithOAuth, resetPasswordForEmail }
    } as never);

    await signInWithGoogle();
    await requestPasswordReset(' COOK@example.com ');

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    expect(resetPasswordForEmail).toHaveBeenCalledWith('cook@example.com', {
      redirectTo: window.location.origin
    });
  });

  it('updates passwords, signs out, and returns unique linked providers', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const getUserIdentities = vi.fn().mockResolvedValue({
      data: { identities: [{ provider: 'email' }, { provider: 'google' }, { provider: 'email' }] },
      error: null
    });
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: { updateUser, signOut: signOutMock, getUserIdentities }
    } as never);

    await updatePassword('new-secret12');
    await signOut();

    expect(updateUser).toHaveBeenCalledWith({ password: 'new-secret12' });
    expect(signOutMock).toHaveBeenCalledOnce();
    await expect(getLinkedProviders()).resolves.toEqual(['email', 'google']);
  });

  it('gets the saved session and forwards auth events with an unsubscribe handle', async () => {
    const session = { user: { id: 'user-1' } } as Session;
    const unsubscribe = vi.fn();
    const onAuthStateChange = vi.fn((callback) => {
      callback('SIGNED_IN', session);
      return { data: { subscription: { unsubscribe } } };
    });
    vi.mocked(getSupabaseClient).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
        onAuthStateChange
      }
    } as never);
    const listener = vi.fn();

    await expect(getSession()).resolves.toBe(session);
    const stop = await subscribeToAuthChanges(listener);

    expect(listener).toHaveBeenCalledWith('SIGNED_IN', session);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('throws a clear error when Supabase is unavailable', async () => {
    vi.mocked(getSupabaseClient).mockResolvedValue(null);

    await expect(signInWithPassword('cook@example.com', 'secret12')).rejects.toThrow('Supabase is not configured');
  });
});
