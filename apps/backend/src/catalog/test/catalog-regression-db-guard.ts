// Catalog regression DB isolation config — fail-closed, no production fallback.
// Multi-endpoint support: reconcile (55432 / reconcile_test) OR migration (55439 / marketplace_migration_test).
export const CATALOG_REGRESSION_CONF = {
  allowedHosts: ['127.0.0.1', 'localhost'],
  allowedPorts: [55432, 55439],
  allowedDBs: new Set(['marketplace_reconcile_test', 'marketplace_migration_test', 'catalog_red_test']),
  allowedUsers: new Set(['reconcile_test', 'postgres', 'migrationtest']),
};

export function assertCatalogRegressionDB(cfg: { host?: string; port?: number; database?: string; username?: string }): void {
  if (!cfg.host || !CATALOG_REGRESSION_CONF.allowedHosts.includes(cfg.host.trim())) {
    throw new Error('FAIL-CLOSED: catalog regression requires loopback host; got ' + cfg.host);
  }
  if (!cfg.port || !CATALOG_REGRESSION_CONF.allowedPorts.includes(cfg.port)) {
    throw new Error('FAIL-CLOSED: catalog regression port must be 55432 or 55439; got ' + cfg.port);
  }
  if (!cfg.database || !CATALOG_REGRESSION_CONF.allowedDBs.has(cfg.database.trim())) {
    throw new Error('FAIL-CLOSED: catalog regression DB must be isolated test DB; got ' + cfg.database);
  }
  if (!cfg.username || !CATALOG_REGRESSION_CONF.allowedUsers.has(cfg.username.trim())) {
    throw new Error('FAIL-CLOSED: catalog regression DB user must be an approved isolated-test role; got ' + cfg.username);
  }
}
