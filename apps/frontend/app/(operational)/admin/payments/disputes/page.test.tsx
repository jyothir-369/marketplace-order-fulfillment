import { render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '@/lib/api';
import AdminDisputesPage from './page';

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('Admin Disputes page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockResolvedValue({
      available: false,
      configured: false,
      note: 'Disputes integration is not configured in this test.',
      pagination: { page: 1, pageSize: 20, total: 0 },
      records: [],
      supportedActions: [],
      deadlinesTracked: false,
    } as never);
  });

  it('renders the disputes page after its API request resolves', async () => {
    render(<AdminDisputesPage />);

    expect(screen.getByText(/Loading disputes/i)).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: /Admin Disputes/i }),
    ).toBeInTheDocument();

    expect(mockApiFetch).toHaveBeenCalledWith('/admin/payments/disputes?page=1');
    expect(
      screen.getByText(/Disputes integration is not configured in this test/i),
    ).toBeInTheDocument();
  });

  it('shows an error state when the API request fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Request unavailable'));

    render(<AdminDisputesPage />);

    expect(await screen.findByText(/Error: Request unavailable/i)).toBeInTheDocument();
  });
});
