export function assertTestDatabaseIsolation(config: { host?: string; port?: number; database?: string }): void {
  if (!config.host || config.host.trim() === '') {
    throw new Error('BLOCKED: DB_HOST missing — isolation not established');
  }
  if (!config.port || typeof config.port !== 'number') {
    throw new Error('BLOCKED: DB_PORT missing/invalid — isolation not established');
  }
  if (!config.database || !config.database.toLowerCase().includes('test')) {
    throw new Error('BLOCKED: database identity does not include "test" — isolation not established');
  }
  // Never fall back to .env/default development DB; never allow non-test target.
  // Never log connection strings or credentials.
}
