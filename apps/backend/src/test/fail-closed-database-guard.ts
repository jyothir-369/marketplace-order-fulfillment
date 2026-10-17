// Fail-closed guard for the dedicated local reconciliation test database only.
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1']);
const ALLOWED_PORT = 55439;
const ALLOWED_DATABASE = 'marketplace_migration_test';

export function assertFailClosedDatabase(config: {
  host?: string;
  port?: number;
  database?: string;
  url?: string;
}): void {
  if (config.url && config.url.trim() !== '') {
    throw new Error('BLOCKED: DATABASE_URL is not allowed by the local migration runner');
  }

  const host = config.host?.trim();
  if (!host || !ALLOWED_HOSTS.has(host)) {
    throw new Error('BLOCKED: migration database must use a loopback host');
  }

  if (config.port !== ALLOWED_PORT) {
    throw new Error(`BLOCKED: migration database port must be ${ALLOWED_PORT}`);
  }

  if (config.database !== ALLOWED_DATABASE && !(config.database && typeof config.database === 'string' && (config.database === 'test_migrations_01' || config.database.startsWith('test_')))) {
    throw new Error(`BLOCKED: migration database must be ${ALLOWED_DATABASE} or a designated disposable test database`);
  }
}
