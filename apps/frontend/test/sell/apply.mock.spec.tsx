import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SellPage from '../../app/(storefront)/sell/page';
import ApplyPage from '../../app/(storefront)/sell/apply/page';
import * as api from '../../lib/api';

jest.mock('../../lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const { useAuth } = require('../../lib/auth-context');

describe('SellPage behavioral', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guest sees Apply as a guest link pointing to /sell/apply', () => {
    useAuth.mockReturnValue({ user: null, status: 'unauthenticated', login: () => {}, register: () => {}, logout: () => {}, refreshSession: () => Promise.resolve(false) });
    render(<SellPage />);
    const link = screen.getByRole('link', { name: /apply as a guest/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/sell/apply');
  });

  it('authenticated buyer does not show the guest-only link', async () => {
    useAuth.mockReturnValue({ user: { id: 'b1', email: 'buyer@test.com', role: 'buyer', displayName: null, vendorId: null }, status: 'authenticated', login: () => {}, register: () => {}, logout: () => {}, refreshSession: () => Promise.resolve(true) });
    jest.spyOn(api, 'getMyVendorApplications').mockResolvedValue([{ id: 'a1', email: 'buyer@test.com', businessName: 'TestCo', status: 'pending', createdAt: '2026-01-01' }] as any);
    render(<SellPage />);
    await waitFor(() => expect(screen.queryByRole('link', { name: /apply as a guest/i })).not.toBeInTheDocument());
  });

  it('authenticated buyer with pending app shows status and not guest link', async () => {
    useAuth.mockReturnValue({ user: { id: 'b1', email: 'buyer@test.com', role: 'buyer', displayName: null, vendorId: null }, status: 'authenticated', login: () => {}, register: () => {}, logout: () => {}, refreshSession: () => Promise.resolve(true) });
    jest.spyOn(api, 'getMyVendorApplications').mockResolvedValue([{ id: 'a1', email: 'buyer@test.com', businessName: 'TestCo', status: 'pending', createdAt: '2026-01-01' }] as any);
    render(<SellPage />);
    await waitFor(() => expect(screen.getByText(/pending/i)).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /apply as a guest/i })).not.toBeInTheDocument();
  });
});

describe('ApplyPage behavioral', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guest enters valid values, submits, API called with normalized values, success shown, no redirect', async () => {
    const user = userEvent.setup();
    let resolveSubmission: (value: any) => void = () => {};
const submission = new Promise<any>((resolve) => { resolveSubmission = resolve; });
const submitSpy = jest.spyOn(api, 'submitVendorApplication').mockReturnValue(submission);
    const pushMock = jest.fn();
    require("next/navigation").useRouter = jest.fn().mockReturnValue({ push: pushMock });
    useAuth.mockReturnValue({ user: null, status: 'unauthenticated', login: () => {}, register: () => {}, logout: () => {}, refreshSession: () => Promise.resolve(false) });
    render(<ApplyPage />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/business name/i), 'B');
    await user.type(screen.getByLabelText(/why do you want to sell/i), 'To grow');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
    expect(submitSpy).toHaveBeenCalledWith({ email: 'a@b.com', businessName: 'B', reason: 'To grow' });
    await act(async () => {
  resolveSubmission({ id: 'v-1', email: 'a@b.com', businessName: 'B', status: 'pending' } as any);
  await submission;
});
expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    submitSpy.mockRestore();
  });

  it('authenticated applicant submits and router navigates to /vendor/applications', async () => {
    const user = userEvent.setup();
    const submitSpy = jest.spyOn(api, 'submitVendorApplication').mockResolvedValue({ id: 'v-1', email: 'a@b.com', businessName: 'B', status: 'pending' } as any);
    const pushMock = jest.fn();
    require("next/navigation").useRouter = jest.fn().mockReturnValue({ push: pushMock });
    useAuth.mockReturnValue({ user: { id: 'u1', email: 'a@b.com', role: 'buyer', displayName: null, vendorId: null }, status: 'authenticated', login: () => {}, register: () => {}, logout: () => {}, refreshSession: () => Promise.resolve(true) });
    render(<ApplyPage />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/business name/i), 'B');
    await user.type(screen.getByLabelText(/why do you want to sell/i), 'To grow');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/vendor/applications'));
    await waitFor(() => expect(screen.queryByRole('button', { name: /submitting/i })).not.toBeInTheDocument());
    submitSpy.mockRestore();
  });

  it('API rejection shows error and allows retry', async () => {
    const user = userEvent.setup();
    const submitSpy = jest.spyOn(api, 'submitVendorApplication').mockRejectedValue(new Error('Rejected'));
    useAuth.mockReturnValue({ user: null, status: 'unauthenticated', login: () => {}, register: () => {}, logout: () => {}, refreshSession: () => Promise.resolve(false) });
    render(<ApplyPage />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/business name/i), 'B');
    await user.type(screen.getByLabelText(/why do you want to sell/i), 'Reason');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument(), { timeout: 500 });
    await waitFor(() => expect(screen.getByRole('button', { name: /submit/i })).not.toBeDisabled());
    submitSpy.mockRestore();
  });

  it('during unresolved promise submit is disabled and repeated clicks do not call again', async () => {
    const user = userEvent.setup();

    let resolveSubmit: (value: any) => void = () => {};
    let submission: Promise<any> = Promise.resolve(null);

    const submitSpy = jest.spyOn(api, 'submitVendorApplication').mockImplementation(() => {
      submission = new Promise<any>((resolve) => {
        resolveSubmit = resolve;
      });
      return submission;
    });

    useAuth.mockReturnValue({
      user: null,
      status: 'unauthenticated',
      login: () => {},
      register: () => {},
      logout: () => {},
      refreshSession: () => Promise.resolve(false),
    });

    render(<ApplyPage />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/business name/i), 'B');
    await user.type(screen.getByLabelText(/why do you want to sell/i), 'Reason');

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /submitting/i }));
    expect(submitSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit({
        id: 'v-2',
        email: 'a@b.com',
        businessName: 'B',
        status: 'pending',
      });
      await submission;
    });

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /submit/i })).not.toBeDisabled()
    );

    expect(submitSpy).toHaveBeenCalledTimes(1);
    submitSpy.mockRestore();
  });
  it('invalid fields show validation errors and API is not called', async () => {
    const user = userEvent.setup();
    const submitSpy = jest.spyOn(api, 'submitVendorApplication').mockResolvedValue({ id: 'v-1' } as any);
    useAuth.mockReturnValue({ user: null, status: 'unauthenticated', login: () => {}, register: () => {}, logout: () => {}, refreshSession: () => Promise.resolve(false) });
    render(<ApplyPage />);
    await user.type(screen.getByLabelText(/email/i), 'bad');
    await user.clear(screen.getByLabelText(/business name/i));
    await user.clear(screen.getByLabelText(/why do you want to sell/i));
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(screen.getByText(/valid email/i)).toBeInTheDocument());
    expect(submitSpy).not.toHaveBeenCalled();
    submitSpy.mockRestore();
  });
});
