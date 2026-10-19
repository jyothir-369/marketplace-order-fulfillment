// Fail-closed database guard — rejects remote DB, DATABASE_URL, wrong names, ports != 55432
export function assertFailClosedDatabase(config: { host?: string; port?: number; database?: string; url?: string }): void {
  // Reject DATABASE_URL-style remote connection strings outright
  if (config.url && (config.url.includes('://') || config.url.includes('@'))) {
    throw new Error('BLOCKED: DATABASE_URL / remote connection string rejected — fail-closed guard');
  }
  if (!config.host || config.host.trim() === '' || config.host === 'localhost' === false) {
    // For verified local test DB only localhost is permitted; anything else is remote
    if (config.host && config.host !== 'localhost' && config.host !== '127.0.0.1') {
      throw new Error('BLOCKED: remote database host rejected (fail-closed)');
    }
    if (!config.host) throw new Error('BLOCKED: DB_HOST missing — fail-closed');
  }
  if (config.host !== 'localhost' && config.host !== '127.0.0.1') {
    throw new Error('BLOCKED: remote database host "' + config.host + '" rejected (fail-closed guard)');
  }
  if (!config.port || typeof config.port !== 'number' || config.port !== 55432) {
    throw new Error('BLOCKED: DB port must be 55432 (fail-closed guard), got ' + config.port);
  }
  if (!config.database || config.database.toLowerCase() !== 'marketplace_order_fulfillment_test') {
    throw new Error('BLOCKED: database name must be marketplace_order_fulfillment_test (fail-closed guard), got ' + config.database);
  }
}
