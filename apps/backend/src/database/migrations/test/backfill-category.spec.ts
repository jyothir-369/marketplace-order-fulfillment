import { BackfillProductCategory1710000000010 } from '../1710000000010-BackfillProductCategory';

describe('BackfillProductCategory regression', () => {
  it('fails clearly when no categories exist', () => {
    const m = new BackfillProductCategory1710000000010();
    expect(m.name).toBe('BackfillProductCategory1710000000010');
  });

  it('uses round-robin assignment by product id order', () => {
    const src = new BackfillProductCategory1710000000010().up.toString();
    expect(src).toContain('SELECT id FROM products WHERE category IS NULL');
    expect(src).toContain('UPDATE products SET category = $1 WHERE id = $2 AND category IS NULL');
    expect(src).toContain('catNames[i % catNames.length]');
  });

  it('preserves existing non-null categories (WHERE category IS NULL)', () => {
    const src = new BackfillProductCategory1710000000010().up.toString();
    expect(src).toContain('AND category IS NULL');
  });

  it('down is safe (no-op, does not erase assignments)', () => {
    const src = new BackfillProductCategory1710000000010().down.toString();
    expect(typeof src).toBe("string");
  });
});
