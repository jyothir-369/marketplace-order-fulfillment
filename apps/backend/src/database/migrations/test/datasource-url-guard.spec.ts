import { assertFailClosedDatabaseFromUrl } from '../../../test/fail-closed-database-guard';

describe('ordinary migration datasource URL fail-closed policy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MIGRATION_TEST_DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_DATABASE;
    delete process.env.DB_USERNAME;
    delete process.env.DB_PASSWORD;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('requires the dedicated migration test URL instead of defaults', () => {
    expect(() => assertFailClosedDatabaseFromUrl(
      process.env.MIGRATION_TEST_DATABASE_URL || '',
    )).toThrow(/MIGRATION_TEST_DATABASE_URL is required explicitly/);
  });

  it('rejects an invalid URL even when legacy fallback fields look valid', () => {
    process.env.MIGRATION_TEST_DATABASE_URL =
      'postgresql://test:password@evil.example:55439/marketplace_migration_test';
    process.env.MIGRATION_TEST_DB_HOST = '127.0.0.1';
    process.env.MIGRATION_TEST_DB_PORT = '55439';
    process.env.MIGRATION_TEST_DB_NAME = 'marketplace_migration_test';

    expect(() => assertFailClosedDatabaseFromUrl(
      process.env.MIGRATION_TEST_DATABASE_URL!,
    )).toThrow(/loopback/);
  });

  it('rejects a URL with query parameters or fragments', () => {
    const base =
      'postgresql://test:password@127.0.0.1:55439/marketplace_migration_test';

    expect(() => assertFailClosedDatabaseFromUrl(`${base}?sslmode=require`))
      .toThrow(/query parameters/);
    expect(() => assertFailClosedDatabaseFromUrl(`${base}#unexpected`))
      .toThrow(/fragments/);
  });
});
