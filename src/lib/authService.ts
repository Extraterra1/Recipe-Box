import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

const CONFIG_ERROR = 'Supabase is not configured. Add the Recipe Box Supabase environment values and restart the app.';

async function requireAuthClient() {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error(CONFIG_ERROR);
  }
  return supabase;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getSession(): Promise<Session | null> {
  const supabase = await requireAuthClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function subscribeToAuthChanges(
  listener: (event: AuthChangeEvent, session: Session | null) => void
): Promise<() => void> {
  const supabase = await requireAuthClient();
  const { data } = supabase.auth.onAuthStateChange(listener);
  return () => data.subscription.unsubscribe();
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = await requireAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string): Promise<void> {
  const supabase = await requireAuthClient();
  const { data, error } = await supabase.auth.signUp({ email: normalizeEmail(email), password });
  if (error) throw error;
  if (!data.session) {
    throw new Error('Sign in with your existing method or use password recovery.');
  }
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await requireAuthClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = await requireAuthClient();
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: window.location.origin
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const supabase = await requireAuthClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function getLinkedProviders(): Promise<string[]> {
  const supabase = await requireAuthClient();
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw error;
  return [...new Set(data.identities.map((identity) => identity.provider))];
}

export async function signOut(): Promise<void> {
  const supabase = await requireAuthClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
