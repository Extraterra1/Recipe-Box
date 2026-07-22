import { Archive, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { FormEvent, useState } from 'react';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot';

type AuthScreenProps = {
  configured: boolean;
  recovery: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onGoogle: () => Promise<void>;
  onRecover: (email: string) => Promise<void>;
  onUpdatePassword: (password: string) => Promise<void>;
  onRecoveryComplete?: () => void;
};

function safeAuthMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('already registered') || message.includes('already exists')) return 'An account with this email already exists. Sign in instead.';
  if (message.includes('existing method')) return 'This email may already use Google. Sign in with Google or reset your password.';
  if (message.includes('password')) return 'Use a password with at least 6 characters.';
  return 'We could not complete that request. Please try again.';
}

export function AuthScreen({
  configured,
  recovery,
  onSignIn,
  onSignUp,
  onGoogle,
  onRecover,
  onUpdatePassword,
  onRecoveryComplete
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const activeMode: AuthMode | 'recovery' = recovery ? 'recovery' : mode;

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword('');
    setConfirmation('');
    setError('');
    setNotice('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (activeMode === 'forgot') {
      setIsSubmitting(true);
      try {
        await onRecover(email);
      } catch {
        // Recovery responses intentionally do not reveal account existence or rate-limit state.
      } finally {
        setIsSubmitting(false);
        setNotice('If that account exists, a reset link is on its way. Check your email.');
      }
      return;
    }

    if ((activeMode === 'sign-up' || activeMode === 'recovery') && password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeMode === 'sign-in') await onSignIn(email, password);
      if (activeMode === 'sign-up') await onSignUp(email, password);
      if (activeMode === 'recovery') {
        await onUpdatePassword(password);
        setNotice('Password updated. Your cookbook is ready.');
        onRecoveryComplete?.();
      }
    } catch (submissionError) {
      setError(safeAuthMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = activeMode === 'sign-in'
    ? 'Welcome back'
    : activeMode === 'sign-up'
      ? 'Create your account'
      : activeMode === 'forgot'
        ? 'Reset your password'
        : 'Choose a new password';
  const description = activeMode === 'sign-in'
    ? 'Open your household cookbook.'
    : activeMode === 'sign-up'
      ? 'Start a recipe box you can share at home.'
      : activeMode === 'forgot'
        ? 'We will send a secure reset link to your email.'
        : 'Set the password you will use from now on.';

  return (
    <main className="auth-shell">
      <section className="auth-surface" aria-labelledby="auth-heading">
        <div className="auth-brand" aria-label="Recipe Box">
          <span className="auth-brand-mark" aria-hidden="true"><Archive size={25} /></span>
          <span>Recipe Box</span>
        </div>

        {(activeMode === 'forgot' || activeMode === 'sign-up') && (
          <button type="button" className="auth-back" onClick={() => switchMode('sign-in')}>
            <ArrowLeft size={17} /> Back to sign in
          </button>
        )}

        <header className="auth-heading">
          <h1 id="auth-heading">{title}</h1>
          <p>{description}</p>
        </header>

        {!configured && (
          <p className="auth-message error" role="alert">Cloud login is not configured for this installation.</p>
        )}

        <form className="auth-form" onSubmit={submit}>
          {activeMode !== 'recovery' && (
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={!configured || isSubmitting}
              />
            </label>
          )}

          {activeMode !== 'forgot' && (
            <label>
              {activeMode === 'recovery' ? 'New password' : 'Password'}
              <span className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={activeMode === 'sign-in' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                  disabled={!configured || isSubmitting}
                />
                <button
                  type="button"
                  className="password-visibility"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
          )}

          {(activeMode === 'sign-up' || activeMode === 'recovery') && (
            <label>
              {activeMode === 'recovery' ? 'Confirm new password' : 'Confirm password'}
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                disabled={!configured || isSubmitting}
              />
            </label>
          )}

          {error && <p className="auth-message error" role="alert">{error}</p>}
          {notice && <p className="auth-message success" role="status">{notice}</p>}

          <button type="submit" className="button primary auth-submit" disabled={!configured || isSubmitting}>
            {isSubmitting
              ? 'Please wait…'
              : activeMode === 'sign-in'
                ? 'Sign in'
                : activeMode === 'sign-up'
                  ? 'Create account'
                  : activeMode === 'forgot'
                    ? 'Send reset link'
                    : 'Save new password'}
          </button>
        </form>

        {activeMode === 'sign-in' && (
          <>
            <button type="button" className="auth-forgot" onClick={() => switchMode('forgot')}>Forgot password?</button>
            <div className="auth-divider"><span>or</span></div>
            <button
              type="button"
              className="button auth-google"
              onClick={() => void onGoogle().catch((googleError) => setError(safeAuthMessage(googleError)))}
              disabled={!configured || isSubmitting}
            >
              <span className="google-g" aria-hidden="true">G</span> Continue with Google
            </button>
            <p className="auth-switch">New to Recipe Box? <button type="button" onClick={() => switchMode('sign-up')}>Create account</button></p>
          </>
        )}
      </section>
    </main>
  );
}
