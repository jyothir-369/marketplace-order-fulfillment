import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from '../app/(auth)/reset-password/page';

describe('reset-password confirmation (focused)', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/reset-password');
  });
  it('shows mismatch error when confirmation does not match', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);
    await user.type(screen.getByPlaceholderText('New password'), 'abc');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'xyz');
    await waitFor(() => expect(screen.getByText(/don't match/i)).toBeInTheDocument());
  });

  it('accepts matching passwords', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);
    await user.type(screen.getByPlaceholderText('New password'), 'secret');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'secret');
    expect(screen.queryByText(/don't match/i)).toBeNull();
  });

  it('shows error on missing token', () => {
    render(<ResetPasswordPage />);
    // token missing when no query param — error shown by page logic
    expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
  });

  it('does not submit when passwords do not match', async () => {
    window.history.replaceState({}, '', '/reset-password?token=t1');
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByPlaceholderText('New password'), 'new');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'different');

    expect(screen.getByText(/don.t match/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update/i })).toBeDisabled();

    fireEvent.submit(screen.getByRole('button', { name: /update/i }).closest('form')!);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('calls API on submit with token', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Password updated securely.' }) }) as any;
    const user = userEvent.setup();
    // Mock window location with token
    window.history.replaceState({}, '', '/reset-password?token=t1');
    render(<ResetPasswordPage />);
    await user.type(screen.getByPlaceholderText('New password'), 'new');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'new');
    await user.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/auth/reset/confirm', expect.any(Object)));
  });

  it('shows success after API success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Password updated securely.' }) }) as any;
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/reset-password?token=t1');
    render(<ResetPasswordPage />);
    await user.type(screen.getByPlaceholderText('New password'), 'new');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'new');
    await user.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => expect(screen.getByText(/updated securely/i)).toBeInTheDocument());
  });

  it('shows error on API failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Failed' }) }) as any;
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/reset-password?token=t1');
    render(<ResetPasswordPage />);
    await user.type(screen.getByPlaceholderText('New password'), 'new');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'new');
    await user.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => expect(screen.getByText(/failed/i)).toBeInTheDocument());
  });

  it('shows network error on fetch exception', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('net')) as any;
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/reset-password?token=t1');
    render(<ResetPasswordPage />);
    await user.type(screen.getByPlaceholderText('New password'), 'new');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'new');
    await user.click(screen.getByRole('button', { name: /update/i }));
    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument());
  });
});
