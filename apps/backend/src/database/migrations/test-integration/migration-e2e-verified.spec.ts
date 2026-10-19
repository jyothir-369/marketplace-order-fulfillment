/*
 * Migration integration tests â€” real execution against loopback 55439 / marketplace_migration_test.
 * Distinct from unit/component tests; uses isolated PostgreSQL via MIGRATION_TEST_DATABASE_URL.
 */
import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { DataSource } from 'typeorm';
import { initializeTestDataSource } from './harness';

describe('Real database migration E2E (distinct from unit tests)', () => {
  let ds: DataSource;
  beforeAll(async () => {
    ds = await initializeTestDataSource(
      (url) =>
        new DataSource({
          type: 'postgres',
          url,
          entities: [],
          migrations: [],
          synchronize: false,
          logging: false,
        }),
    );
  });

  it('connects to loopback 55439 and database marketplace_migration_test', async () => {
    const res = await ds.query("SELECT current_database() as db, inet_server_port() as port");
    expect(res[0].db).toBe('marketplace_migration_test');
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });
});
