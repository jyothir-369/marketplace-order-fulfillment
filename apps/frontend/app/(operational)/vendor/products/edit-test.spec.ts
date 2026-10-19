import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VendorProductsPage from './page';

jest.mock('@/lib/hooks/use-vendor-id', () => ({ useVendorId: () => 'vendor-7eb8800f' }));
jest.mock('@/lib/api', () => ({
  getVendorProducts: jest.fn().mockResolvedValue([{ id:'p1', name:'Gaming Mouse', price:59.99, stockCount:60, category:'Electronics', description:'mouse', images:['https://picsum.photos/seed/m1/200/200'], isActive:true, vendorId:'vendor-7eb8800f', version:1 }]),
  updateProduct: jest.fn().mockResolvedValue({ id:'p1', name:'Gaming Mouse Updated', price:59.99, stockCount:60, category:'Electronics', isActive:true }),
  createProduct: jest.fn(),
  deleteProduct: jest.fn(),
  updateStock: jest.fn().mockResolvedValue({ ok: true }),
}));
jest.mock('@/components/ui/toast', () => ({ useToast: () => ({ push: jest.fn() }) }));

describe('Vendor product edit form end-to-end', () => {
  it('shows enabled Save changes button when editing existing product', async () => {
    render(<VendorProductsPage />);
    await waitFor(() => expect(screen.getByText('Gaming Mouse')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Edit Gaming Mouse'));
    await waitFor(() => expect(screen.getByText('Edit product')).toBeInTheDocument());
    const saveBtn = screen.getByRole('button', { name: /Save changes/i });
    expect(saveBtn).toBeEnabled();
    expect(saveBtn).toHaveAttribute('type', 'submit');
  });

  it('submits PATCH call on save and refreshes list', async () => {
    const { updateProduct } = require('@/lib/api');
    render(<VendorProductsPage />);
    await waitFor(() => expect(screen.getByText('Gaming Mouse')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Edit Gaming Mouse'));
    await waitFor(() => expect(screen.getByText('Edit product')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Gaming Mouse Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalled());
    expect(updateProduct).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Gaming Mouse Updated' }));
  });

  it('omits stockCount from PATCH when unchanged (metadata-only update)', async () => {
    const { updateProduct } = require('@/lib/api');
    render(<VendorProductsPage />);
    await waitFor(() => expect(screen.getByText('Gaming Mouse')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Edit Gaming Mouse'));
    await waitFor(() => expect(screen.getByText('Edit product')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated description' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalled());
    const lastCall = (updateProduct as jest.Mock).mock.calls.at(-1);
    expect(lastCall[1]).not.toHaveProperty('stockCount');
    expect(lastCall[1]).toMatchObject({ description: 'Updated description' });
  });

  it('includes description, category, and images in PATCH payload', async () => {
    const { updateProduct } = require('@/lib/api');
    render(<VendorProductsPage />);
    await waitFor(() => expect(screen.getByText('Gaming Mouse')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Edit Gaming Mouse'));
    await waitFor(() => expect(screen.getByText('Edit product')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Gaming Mouse Updated' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Electronics' } });
    fireEvent.change(screen.getByLabelText('Image URLs (comma-separated)'), { target: { value: 'https://picsum.photos/seed/x/200/200' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalled());
    const lastCall = (updateProduct as jest.Mock).mock.calls.at(-1);
    expect(lastCall[1]).toMatchObject({ name: 'Gaming Mouse Updated', category: 'Electronics', images: ['https://picsum.photos/seed/x/200/200'] });
  });

  it('routes changed stock through audited endpoint and keeps metadata payload clean', async () => {
    const { updateProduct, updateStock } = require('@/lib/api');
    render(<VendorProductsPage />);
    await waitFor(() => expect(screen.getByText('Gaming Mouse')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Edit Gaming Mouse'));
    await waitFor(() => expect(screen.getByText('Edit product')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Stock quantity'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalled());
    await waitFor(() => expect(updateStock).toHaveBeenCalled());
    const metaCall = (updateProduct as jest.Mock).mock.calls.at(-1);
    expect(metaCall[1]).not.toHaveProperty('stockCount');
    expect(updateStock).toHaveBeenCalledWith('p1', { stockCount: 75 });
  });

  it('preserves authorization failure surface (guard untouched; payload stays safe)', async () => {
    const { updateProduct } = require('@/lib/api');
    (updateProduct as jest.Mock).mockRejectedValueOnce(Object.assign(new Error('Unauthorized'), { statusCode: 401 }));
    render(<VendorProductsPage />);
    await waitFor(() => expect(screen.getByText('Gaming Mouse')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Edit Gaming Mouse'));
    await waitFor(() => expect(screen.getByText('Edit product')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('shows validation error when price invalid', async () => {
    render(<VendorProductsPage />);
    await waitFor(() => expect(screen.getByText('Gaming Mouse')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Edit Gaming Mouse'));
    await waitFor(() => expect(screen.getByText('Edit product')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
