import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthScreen } from './AuthScreen';

const actions = () => ({
  onSignIn: vi.fn().mockResolvedValue(undefined),
  onSignUp: vi.fn().mockResolvedValue(undefined),
  onGoogle: vi.fn().mockResolvedValue(undefined),
  onRecover: vi.fn().mockResolvedValue(undefined),
  onUpdatePassword: vi.fn().mockResolvedValue(undefined)
});

describe('AuthScreen', () => {
  it('shows email/password and Google sign-in outside the application menu', async () => {
    const callbacks = actions();
    render(<AuthScreen configured recovery={false} {...callbacks} />);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'cook@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(callbacks.onSignIn).toHaveBeenCalledWith('cook@example.com', 'secret12');
  });

  it('creates an account only when both passwords match', async () => {
    const callbacks = actions();
    render(<AuthScreen configured recovery={false} {...callbacks} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret12');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different12');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(callbacks.onSignUp).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText('Confirm password'));
    await userEvent.type(screen.getByLabelText('Confirm password'), 'secret12');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(callbacks.onSignUp).toHaveBeenCalledWith('new@example.com', 'secret12');
  });

  it('sends a neutral password recovery response', async () => {
    const callbacks = actions();
    callbacks.onRecover.mockRejectedValue(new Error('rate limited'));
    render(<AuthScreen configured recovery={false} {...callbacks} />);
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await userEvent.type(screen.getByLabelText('Email'), 'cook@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(callbacks.onRecover).toHaveBeenCalledWith('cook@example.com');
    expect(await screen.findByRole('status')).toHaveTextContent('If that account exists, a reset link is on its way');
  });

  it('shows a focused new-password form during recovery', async () => {
    const callbacks = actions();
    render(<AuthScreen configured recovery {...callbacks} />);
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('New password'), 'new-secret12');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-secret12');
    await userEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(callbacks.onUpdatePassword).toHaveBeenCalledWith('new-secret12');
  });

  it('explains when cloud login is not configured', () => {
    render(<AuthScreen configured={false} recovery={false} {...actions()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Cloud login is not configured');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });
});
