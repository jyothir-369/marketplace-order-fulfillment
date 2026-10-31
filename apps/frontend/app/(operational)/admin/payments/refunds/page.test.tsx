import { render, screen } from '@testing-library/react';
import { apiFetch } from '@/lib/api';
import AdminRefundsPage from './page';

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('Admin Refunds page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockResolvedValue({
      available: false,
      configured: false,
      note: 'Refund integration is not configured in this test.',
      pagination: { page: 1, pageSize: 20, total: 0 },
      records: [],
      rulesStatus: {},
      safeOperations: [],
      blockedOperations: [],
    } as never);
  });

  it('renders the refunds page after its API request resolves', async () => {
    render(<AdminRefundsPage />);

    expect(screen.getByText(/Loading refunds/i)).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: /Admin Refunds/i }),
    ).toBeInTheDocument();

    expect(mockApiFetch).toHaveBeenCalledWith('/admin/payments/refunds?page=1');
    expect(
      screen.getByText(/Refund integration is not configured in this test/i),
    ).toBeInTheDocument();
  });

  it('shows an error state when the API request fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Request unavailable'));

    render(<AdminRefundsPage />);

    expect(await screen.findByText(/Error: Request unavailable/i)).toBeInTheDocument();
  });
});
