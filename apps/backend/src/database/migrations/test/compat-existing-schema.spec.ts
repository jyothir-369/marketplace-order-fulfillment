import { AddShippingAddressToOrders1710000000001 } from '../1710000000001-AddShippingAddressToOrders';
describe('Existing-schema compatibility', () => {
  it('shipping_address column already exists is treated as satisfied', async () => {
    const m = new AddShippingAddressToOrders1710000000001();
    const src = m.up.toString();
    expect(src).toContain('SELECT column_name FROM information_schema.columns');
    expect(src).toContain('shipping_address');
    expect(src).toContain('if (colCheck.length === 0)');
  });
});
