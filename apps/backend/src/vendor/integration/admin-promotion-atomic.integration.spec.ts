import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { AdminPromotionService } from '../admin-promotion.service';

describe('AdminPromotion atomic approval - REAL PostgreSQL', () => {
  jest.setTimeout(120000);

  let pool: Pool;
  let service: AdminPromotionService;

  beforeAll(async () => {
    const connectionString = process.env.MIGRATION_E2E_DATABASE_URL;

    if (!connectionString) {
      throw new Error('MIGRATION_E2E_DATABASE_URL is required.');
    }

    const url = new URL(connectionString);

    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      !/^\/category_a_integration_[a-z0-9_]+$/i.test(url.pathname)
    ) {
      throw new Error('Unsafe integration database URL. Refusing to continue.');
    }

    pool = new Pool({ connectionString });

    await pool.query('SELECT 1');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id uuid PRIMARY KEY,
        approval_state varchar(20) NOT NULL DEFAULT 'PENDING',
        approved_by uuid NULL,
        approved_at timestamp NULL
      )
    `);

    service = new AdminPromotionService({
      query: async (sql: string, params?: unknown[]) => {
        const result = await pool.query(sql, params);
        return result.rows;
      },
      findOne: async (options: any) => {
        const result = await pool.query(
          'SELECT * FROM promotions WHERE id = $1',
          [options?.where?.id],
        );
        return result.rows[0] ?? null;
      },
      save: jest.fn(),
    } as any);
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DROP TABLE IF EXISTS promotions');
      await pool.end();
    }
  });

  it('allows exactly one of two concurrent approvals', async () => {
    const promotionId = randomUUID();
    const adminOne = randomUUID();
    const adminTwo = randomUUID();

    await pool.query(
      'INSERT INTO promotions (id, approval_state) VALUES ($1, $2)',
      [promotionId, 'PENDING'],
    );

    const results = await Promise.allSettled([
      service.approve(promotionId, adminOne),
      service.approve(promotionId, adminTwo),
    ]);

    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);

    const finalState = await pool.query(
      `SELECT approval_state, approved_by, approved_at
       FROM promotions WHERE id = $1`,
      [promotionId],
    );

    expect(finalState.rows).toHaveLength(1);
    expect(finalState.rows[0].approval_state).toBe('APPROVED');
    expect([adminOne, adminTwo]).toContain(finalState.rows[0].approved_by);
    expect(finalState.rows[0].approved_at).not.toBeNull();
  });

  it('does not overwrite the first administrator audit record', async () => {
    const promotionId = randomUUID();
    const adminOne = randomUUID();
    const adminTwo = randomUUID();

    await pool.query(
      'INSERT INTO promotions (id, approval_state) VALUES ($1, $2)',
      [promotionId, 'PENDING'],
    );

    await service.approve(promotionId, adminOne);

    await expect(
      service.approve(promotionId, adminTwo),
    ).rejects.toThrow();

    const result = await pool.query(
      'SELECT approval_state, approved_by FROM promotions WHERE id = $1',
      [promotionId],
    );

    expect(result.rows[0].approval_state).toBe('APPROVED');
    expect(result.rows[0].approved_by).toBe(adminOne);
  });
});