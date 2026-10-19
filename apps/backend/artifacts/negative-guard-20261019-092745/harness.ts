/**
 * Fail-closed migration integration-test URL validation.
 * Never falls back to DATABASE_URL or .env.
 */
import { MIGRATION_REGISTRY } from '../registry';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1']);
const ALLOWED_PORT = '55439';
const ALLOWED_DATABASE = '/marketplace_migration_test';

export function requireTestUrl(): string {
  const raw = process.env.MIGRATION_TEST_DATABASE_URL;

  if (!raw || raw.trim() === '') {
    throw new Error('BLOCKED: MIGRATION_TEST_DATABASE_URL is required explicitly');
  }

  if (raw !== raw.trim()) {
    throw new Error('BLOCKED: URL must not contain surrounding whitespace');
  }

  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('BLOCKED: MIGRATION_TEST_DATABASE_URL is not a valid URL');
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('BLOCKED: URL must use postgres: or postgresql:');
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error('BLOCKED: URL must target localhost or 127.0.0.1');
  }

  if (parsed.port !== ALLOWED_PORT) {
    throw new Error('BLOCKED: URL must use host-mapped port 55439');
  }

  if (parsed.pathname !== ALLOWED_DATABASE) {
    throw new Error('BLOCKED: URL must target marketplace_migration_test');
  }

  if (parsed.search !== '' || parsed.hash !== '') {
    throw new Error('BLOCKED: URL query parameters and fragments are prohibited');
  }

  if (!parsed.username || !parsed.password) {
    throw new Error('BLOCKED: URL must include explicit database credentials');
  }

  return raw;
}

export function getCanonicalClasses(): string[] {
  return [...MIGRATION_REGISTRY];
}
