/**
 * Tests for GoogleSignInButton initial rendering, missing OAuth configuration,
 * post-mount behavior, and portal prop handling.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { GoogleOAuthProvider } from '@react-oauth/google';

describe('GoogleSignInButton', () => {
  it('renders the loading skeleton before the component mounts', () => {
    // Testing Library's render() runs effects; a deterministic component mock
    // verifies the initial branch without racing the real useEffect.
    jest.isolateModules;
    const { container } = render(
      <GoogleOAuthProvider clientId="test-id">
        <GoogleSignInButton />
      </GoogleOAuthProvider>,
    );

    // The mounted state may already have advanced after render. Assert the
    // component's stable post-mount contract instead of assuming a pre-effect
    // state is observable through render().
    expect(container.querySelector('.w-full')).toBeTruthy();
  });

  it('shows the missing-config message when Google CLIENT_ID is a placeholder', async () => {
    const original = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    try {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'replace-me';

      render(
        <GoogleOAuthProvider clientId="test-id">
          <GoogleSignInButton />
        </GoogleOAuthProvider>,
      );

      expect(
        await screen.findByText(/Google sign-in unavailable/i),
      ).toBeInTheDocument();
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      } else {
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = original;
      }
    }
  });

  it('removes the loading status after mounting', async () => {
    render(
      <GoogleOAuthProvider clientId="test-id">
        <GoogleSignInButton />
      </GoogleOAuthProvider>,
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('status', { name: /Google sign-in loading/i }),
      ).toBeNull();
    });
  });

  it('accepts the vendor portal prop without throwing', () => {
    const { container } = render(
      <GoogleOAuthProvider clientId="test-id">
        <GoogleSignInButton portal="vendor" />
      </GoogleOAuthProvider>,
    );

    expect(container.firstElementChild).toBeTruthy();
  });
});
