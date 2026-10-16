/** Test-only database guard — fails closed if target is not the designated test DB. */
export function assertTestDatabaseOnly(dbName: string | undefined, host: string | undefined): void {
  const allowedHost = 'localhost';
  const allowedDb = 'marketplace_order_fulfillment_test';
  if (!dbName || !dbName.toLowerCase().includes('test')) {
    throw new Error('BLOCKED: database identity "' + (dbName || '') + '" is not the test database');
  }
  if (dbName !== allowedDb) {
    throw new Error('BLOCKED: expected "' + allowedDb + '" but got "' + dbName + '"');
  }
  if (host && host !== allowedHost) {
    throw new Error('BLOCKED: host must be local disposable instance');
  }
}
