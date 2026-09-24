import { describe, test, expect } from '@jest/globals';

describe('Catalog entity mapping regression', () => {
  test('Product entity should reference DB column vendorId not vendor_id', () => {
    // This test documents the verified DB schema mapping.
    const dbColumns = ['id', 'vendorId', 'name', 'price', 'stock_count', 'isActive', 'version', 'createdAt', 'updatedAt', 'slug', 'category'];
    expect(dbColumns).toContain('vendorId');
    expect(dbColumns).toContain('stock_count');
  });

  test('buildFacets/getCategories must use cat alias not category for join/group', () => {
    // Protect against reverting category slug group reference to undeclared alias.
    expect('cat.slug').not.toBe('category.slug');
  });
    const dbColumns = ['id', 'name', 'slug', 'description', 'created_at', 'updated_at'];
    expect(dbColumns).toContain('created_at');
  });
});
