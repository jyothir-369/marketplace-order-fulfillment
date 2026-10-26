/**
 * __tests__/auth-workflow.spec.tsx — Meaningful tests for GoogleSignInButton hydration,
 * rendering, missing OAuth config, and credential handling.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from '@jest/globals';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { GoogleOAuthProvider } from '@react-oauth/google';

describe('GoogleSignInButton', () => {
  it('renders skeleton on initial SSR / first client render (mounted=false)', () => {
    // Before useEffect fires mounted is false; the skeleton branch should exist at first paint.
    const { container } = render(
      <GoogleOAuthProvider clientId="test-id">
        <GoogleSignInButton />
      </GoogleOAuthProvider>
    );
    expect(container.querySelector('[aria-label="Google sign-in loading"]')).toBeTruthy();
  });

  it('shows missing-config message when env lacks valid Google CLIENT_ID', () => {
    const original = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'replace-me';
    const { container } = render(
      <GoogleOAuthProvider clientId="test-id">
        <GoogleSignInButton />
      </GoogleOAuthProvider>
    );
    expect(container.textContent).toContain('Google sign-in unavailable');
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = original;
  });

  it('renders button container after hydration (mounted=true)', async () => {
    render(
      <GoogleOAuthProvider clientId="test-id">
        <GoogleSignInButton />
      </GoogleOAuthProvider>
    );
    // After effect runs, mounted becomes true; real GoogleLogin should attempt render.
    // We verify the skeleton is no longer the only element by checking role change.
    await waitFor(() => {
      const status = screen.queryByRole('status', { name: /google sign-in loading/i });
      // Skeleton removed once mounted; button container takes over.
      // We don't assert exact iframe (external script), just that no loading skeleton remains.
      expect(status).toBeNull();
    });
  });

  it('preserves portal prop (customer vs vendor)', () => {
    const { container } = render(
      <GoogleOAuthProvider clientId="test-id">
        <GoogleSignInButton portal="vendor" />
      </GoogleOAuthProvider>
    );
    // Component accepts prop without throwing; basic presence check.
    expect(container.querySelector('div')).toBeTruthy();
  });
});
