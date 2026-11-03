import { DataSource } from 'typeorm';
import { CategoryAPromotionFundingApproval20261103 } from '../20261103-CategoryA-PromotionFundingApproval';
import { CategoryAPromotionApprovedAt20261103 } from '../20261103-CategoryA-PromotionApprovedAt';

describe('Category A migrations - REAL PostgreSQL upgrade and rollback', () => {
  jest.setTimeout(120000);

  let dataSource: DataSource;

  beforeAll(async () => {
    const connectionString = process.env.MIGRATION_TEST_DATABASE_URL;

    if (!connectionString) {
      throw new Error('MIGRATION_TEST_DATABASE_URL is required.');
    }

    const url = new URL(connectionString);

    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      !/^\/category_a_migration_[a-z0-9_]+$/i.test(url.pathname)
    ) {
      throw new Error('Unsafe migration database URL. Refusing to continue.');
    }

    dataSource = new DataSource({
      type: 'postgres',
      url: connectionString,
      entities: [],
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query('DROP TABLE IF EXISTS promotions');
      await dataSource.destroy();
    }
  });

  it('executes both migrations, validates the real schema, and rolls back', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();

    try {
      await runner.query('DROP TABLE IF EXISTS promotions');

      await runner.query(`
        CREATE TABLE promotions (
          id uuid PRIMARY KEY
        )
      `);

      const funding = new CategoryAPromotionFundingApproval20261103();
      const approvedAt = new CategoryAPromotionApprovedAt20261103();

      await funding.up(runner);
      await approvedAt.up(runner);

      const columns = await runner.query(`
        SELECT column_name, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'promotions'
      `);

      const byName = new Map(
        columns.map((column: any) => [column.column_name, column]),
      );

      for (const name of [
        'funding_type',
        'vendor_contribution_percent',
        'marketplace_contribution_percent',
        'currency',
        'approval_state',
        'approved_by',
        'submitted_at',
        'approved_at',
      ]) {
        expect(byName.has(name)).toBe(true);
      }

      const vendorPercent: any = byName.get('vendor_contribution_percent');
      const marketplacePercent: any = byName.get('marketplace_contribution_percent');

      expect(Number(vendorPercent.numeric_precision)).toBe(10);
      expect(Number(vendorPercent.numeric_scale)).toBe(2);
      expect(Number(marketplacePercent.numeric_precision)).toBe(10);
      expect(Number(marketplacePercent.numeric_scale)).toBe(2);

      const indexes = await runner.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'promotions'
          AND indexname = 'idx_promo_approval_state'
      `);

      expect(indexes).toHaveLength(1);

      await approvedAt.down(runner);
      await funding.down(runner);

      const remaining = await runner.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'promotions'
        ORDER BY ordinal_position
      `);

      expect(remaining.map((column: any) => column.column_name)).toEqual(['id']);

      const remainingIndexes = await runner.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'promotions'
          AND indexname = 'idx_promo_approval_state'
      `);

      expect(remainingIndexes).toHaveLength(0);
    } finally {
      await runner.release();
    }
  });
});