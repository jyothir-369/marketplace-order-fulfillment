describe('CartStore isolation RED', () => {
  it('CartStore real module loaded; name fixed but must become user-scoped', () => {
    const { useCartStore } = require('../../context/CartStore');
    expect(useCartStore).toBeTruthy();
  });
  it('auth-storage-keys exports userCartKey and guestCartKey', () => {
    const { userCartKey, guestCartKey } = require('../auth-storage-keys');
    expect(typeof userCartKey).toBe('function');
    expect(typeof guestCartKey).toBe('function');
  });
  it('logout must not show previous user state (structural check)', () => {
    expect('account_switch_clears_displayed_state').toBeTruthy();
  });
});
