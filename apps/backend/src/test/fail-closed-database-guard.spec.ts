import { assertFailClosedDatabase, assertFailClosedDatabaseFromUrl } from './fail-closed-database-guard';

const safeTarget = {
  host: '127.0.0.1',
  port: 55439,
  database: 'marketplace_migration_test',
  url: '',
};

describe('Fail-closed database guard', () => {
  it('allows only the dedicated local test target', () => {
    expect(() => assertFailClosedDatabase(safeTarget)).not.toThrow();
  });

  it('allows MIGRATION_TEST_DATABASE_URL with correct values', () => {
    const url = 'postgres://reconcile_test@127.0.0.1:55439/marketplace_migration_test';
    expect(() => assertFailClosedDatabaseFromUrl(url)).not.toThrow();
  });

  it('rejects connection URLs, including local URLs', () => {
    expect(() => assertFailClosedDatabase({
      ...safeTarget,
      url: 'postgres://localhost/test',
    })).toThrow(/BLOCKED/);
  });

  it('rejects remote hosts', () => {
    expect(() => assertFailClosedDatabase({
      ...safeTarget,
      host: 'db.example.com',
    })).toThrow(/BLOCKED/);
  });

  it('rejects the production database name', () => {
    expect(() => assertFailClosedDatabase({
      ...safeTarget,
      database: 'marketplace',
    })).toThrow(/BLOCKED/);
  });

  it('rejects the wrong port', () => {
    expect(() => assertFailClosedDatabase({
      ...safeTarget,
      port: 5432,
    })).toThrow(/BLOCKED/);
  });

  it('rejects missing host, port, or database', () => {
    expect(() => assertFailClosedDatabase({ ...safeTarget, host: undefined })).toThrow(/BLOCKED/);
    expect(() => assertFailClosedDatabase({ ...safeTarget, port: undefined })).toThrow(/BLOCKED/);
    expect(() => assertFailClosedDatabase({ ...safeTarget, database: undefined })).toThrow(/BLOCKED/);
  });

  it('rejects generic test_* database names', () => {
    expect(() => assertFailClosedDatabase({
      ...safeTarget,
      database: 'test_migrations_01',
    })).toThrow(/BLOCKED/);
    expect(() => assertFailClosedDatabase({
      ...safeTarget,
      database: 'test_custom_db',
    })).toThrow(/BLOCKED/);
  });

  it('rejects malformed URLs embedded in host field', () => {
    expect(() => assertFailClosedDatabase({
      ...safeTarget,
      host: 'postgres://localhost:5432/db',
    })).toThrow(/BLOCKED/);
  });

  it('rejects malformed URLs embedded in database field', () => {
    expect(() => assertFailClosedDatabase({
      ...safeTarget,
      database: 'postgres://localhost/test',
    })).toThrow(/BLOCKED/);
  });

  it('rejects MIGRATION_TEST_DATABASE_URL with remote host', () => {
    expect(() => assertFailClosedDatabaseFromUrl(
      'postgres://reconcile_test@db.example.com:55439/marketplace_migration_test'
    )).toThrow(/BLOCKED/);
  });

  it('rejects MIGRATION_TEST_DATABASE_URL with wrong port', () => {
    expect(() => assertFailClosedDatabaseFromUrl(
      'postgres://reconcile_test@127.0.0.1:5432/marketplace_migration_test'
    )).toThrow(/BLOCKED/);
  });

  it('rejects MIGRATION_TEST_DATABASE_URL with wrong database', () => {
    expect(() => assertFailClosedDatabaseFromUrl(
      'postgres://reconcile_test@127.0.0.1:55439/marketplace'
    )).toThrow(/BLOCKED/);
  });

  it('rejects MIGRATION_TEST_DATABASE_URL with test_* database', () => {
    expect(() => assertFailClosedDatabaseFromUrl(
      'postgres://reconcile_test@127.0.0.1:55439/test_migrations_01'
    )).toThrow(/BLOCKED/);
  });

  it('rejects invalid MIGRATION_TEST_DATABASE_URL format', () => {
    expect(() => assertFailClosedDatabaseFromUrl('not-a-url')).toThrow(/BLOCKED/);
  });

  it('rejects missing MIGRATION_TEST_DATABASE_URL', () => {
    expect(() => assertFailClosedDatabaseFromUrl('')).toThrow(/BLOCKED/);
  });
});
