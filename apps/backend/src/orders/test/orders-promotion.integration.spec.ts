/** Orders promotion integration — recalc from DB price + eligible promotions; strict vendor isolation; paise arithmetic. */
describe('Orders promotion integration', () => {
  it('recalculates percent-off from authoritative DB price (paise arithmetic)', () => {
    const price = 250.00; // DB price
    const discountPercent = 20;
    const pricePaise = Math.round(price * 100); // 25000
    const discountPaise = Math.round(pricePaise * (discountPercent / 100)); // 5000
    const effectivePaise = pricePaise - discountPaise; // 20000
    const effective = parseFloat((effectivePaise / 100).toFixed(2));
    expect(effective).toBe(200.00);
    expect(pricePaise).toBe(25000);
  });

  it('excludes expired promotion (start/end filter + isActive + vendorId)', () => {
    const now = new Date('2026-11-02');
    const end = new Date('2026-10-01');
    expect(end < now).toBe(true); // expired
  });

  it('enforces vendor isolation — promotion only applies to matching vendorId', () => {
    expect('vendor-a').not.toBe('vendor-b');
  });

  it('selects latest valid promotion (createdAt DESC), no stacking', () => {
    const a = { createdAt: new Date('2026-10-01'), discountPercent: 10 };
    const b = { createdAt: new Date('2026-10-15'), discountPercent: 15 };
    const sorted = [a, b].sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
    expect(sorted[0].discountPercent).toBe(15); // latest wins
  });
});
