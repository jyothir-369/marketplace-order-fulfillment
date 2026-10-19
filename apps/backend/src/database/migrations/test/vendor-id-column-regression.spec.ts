import { Product } from '../../../common/entities/product.entity';
import { MIGRATION_REGISTRY, DUPLICATE_TIMESTAMPS } from '../registry';

describe('vendor column regression', () => {
  it('entity exists', () => expect(typeof Product).toBe('function'));
  it('registry contains 1710000000005 / 0006 / 20261014', () => {
    expect(MIGRATION_REGISTRY).toContain('1710000000005-CategoriesAndCatalogContract');
    expect(MIGRATION_REGISTRY).toContain('1710000000006-AddMissingForeignKeysAndIndexes');
    expect(MIGRATION_REGISTRY).toContain('20261014-FixProductVendorIdColumn');
  });
  it('duplicate timestamps preserved', () => {
    expect(DUPLICATE_TIMESTAMPS).toContain('1710000000005');
    expect(DUPLICATE_TIMESTAMPS).toContain('2026101300000');
  });
});
