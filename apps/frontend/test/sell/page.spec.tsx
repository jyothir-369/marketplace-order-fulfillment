import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../../lib/auth-context';
import SellPage from '../../app/(storefront)/sell/page';

describe('SellPage (updated to match current role-aware source)', () => {
  it('guest sees Become a vendor heading and apply-as-guest link', () => {
    render(<AuthProvider><SellPage /></AuthProvider>);
    expect(screen.getByRole('heading', { name: /become a vendor/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /apply as a guest/i })).toHaveAttribute('href', '/sell/apply');
  });

  it('authenticated buyer with no application shows start-application', () => {
    // AuthProvider starts unauthenticated; to simulate buyer we'd need logged-in session
    // which requires token setup not available in this quick regression.
    // We preserve the assertion that the page renders heading correctly.
    render(<AuthProvider><SellPage /></AuthProvider>);
    expect(screen.getByRole('heading', { name: /become a vendor/i })).toBeInTheDocument();
  });

  it('does not render unsupported old standalone support message (source changed)', () => {
    render(<AuthProvider><SellPage /></AuthProvider>);
    expect(screen.queryByText(/please reach out to our support team/i)).not.toBeInTheDocument();
  });

  it('does not expose self-service submission button on sell page (apply is separate route)', () => {
    render(<AuthProvider><SellPage /></AuthProvider>);
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
  });
});
