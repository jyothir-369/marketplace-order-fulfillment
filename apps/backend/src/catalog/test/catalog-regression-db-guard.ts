// Catalog regression DB isolation config — fail-closed, no production fallback.
// Multi-endpoint support: reconcile (55432 / reconcile_test) OR migration (55439 / marketplace_migration_test).
export const CATALOG_REGRESSION_CONF = {
  allowedHosts: ['127.0.0.1', 'localhost'],
  allowedPorts: [55432, 55439, 60920],
  allowedDBs: new Set(['catalog_category6_test', 'marketplace_catalog_regression_test']),
  allowedUsers: new Set(['catalogtest', 'migrationtest']),
};

export function assertCatalogRegressionDB(cfg: { host?: string; port?: number; database?: string; username?: string }): void {
  if (!cfg.host || !CATALOG_REGRESSION_CONF.allowedHosts.includes(cfg.host.trim())) {
    throw new Error('FAIL-CLOSED: catalog regression requires loopback host; got ' + cfg.host);
  }
  if (!cfg.port || !CATALOG_REGRESSION_CONF.allowedPorts.includes(cfg.port)) {
    throw new Error('FAIL-CLOSED: catalog regression port must be one of the explicitly allowed isolated-test ports; got ' + cfg.port);
  }
  if (!cfg.database || !CATALOG_REGRESSION_CONF.allowedDBs.has(cfg.database.trim())) {
    throw new Error('FAIL-CLOSED: catalog regression DB must be isolated test DB; got ' + cfg.database);
  }
  if (!cfg.username || !CATALOG_REGRESSION_CONF.allowedUsers.has(cfg.username.trim())) {
    throw new Error('FAIL-CLOSED: catalog regression DB user must be an approved isolated-test role; got ' + cfg.username);
  }
}
