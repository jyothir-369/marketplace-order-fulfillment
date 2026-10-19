import { assertFailClosedDatabase } from './fail-closed-database-guard';

describe('Fail-closed database guard', () => {
  it('rejects DATABASE_URL style remote string', () => {
    expect(() => assertFailClosedDatabase({ url: 'postgres://user:pass@remote.db/prod', host: 'remote.db', port: 5432, database: 'prod' })).toThrow(/BLOCKED/);
  });
  it('rejects remote host', () => {
    expect(() => assertFailClosedDatabase({ host: 'remote.db.host', port: 55432, database: 'test', url: '' })).toThrow(/BLOCKED/);
  });
  it('rejects incorrect database name', () => {
    expect(() => assertFailClosedDatabase({ host: 'localhost', port: 55432, database: 'marketplace_prod', url: '' })).toThrow(/BLOCKED/);
  });
  it('rejects port other than 55432', () => {
    expect(() => assertFailClosedDatabase({ host: 'localhost', port: 5432, database: 'marketplace_order_fulfillment_test', url: '' })).toThrow(/BLOCKED/);
  });
  it('allows only localhost + 55432 + test db', () => {
    expect(() => assertFailClosedDatabase({ host: 'localhost', port: 55432, database: 'marketplace_order_fulfillment_test', url: '' })).not.toThrow();
  });
});

describe('Mal-formed DATABASE_URL guard', () => {
  it('rejects non-empty DATABASE_URL even with localhost params', () => {
    expect(() => assertFailClosedDatabase({ host: 'localhost', port: 55432, database: 'marketplace_order_fulfillment_test', url: 'postgres://x' })).toThrow(/BLOCKED/);
  });
  it('rejects DATABASE_URL missing database element', () => {
    expect(() => assertFailClosedDatabase({ host: 'localhost', port: 55432, database: 'test', url: 'postgres://user:pass@host/' })).toThrow(/BLOCKED/);
  });
});
