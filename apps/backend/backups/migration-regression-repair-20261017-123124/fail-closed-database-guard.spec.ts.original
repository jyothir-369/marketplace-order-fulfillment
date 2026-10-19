import { assertFailClosedDatabase } from './fail-closed-database-guard';

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
});
