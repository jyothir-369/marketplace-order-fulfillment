/**
 * Migration integration-test harness.
 * Canonical source: MIGRATION_REGISTRY (25 classes).
 * Requires MIGRATION_TEST_DATABASE_URL explicitly; validates loopback 55439.
 * Never falls back to .env / DATABASE_URL. Never invokes production runner.
 */

import { DataSource } from 'typeorm';
import { MIGRATION_REGISTRY } from '../registry';

function requireTestUrl(): string {
  const url = process.env.MIGRATION_TEST_DATABASE_URL;
  if (!url || url.trim() === '') {
    throw new Error('BLOCKED: MIGRATION_TEST_DATABASE_URL is required explicitly');
  }
  const parsed = new URL(url);
  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    throw new Error('BLOCKED: MIGRATION_TEST_DATABASE_URL must target loopback (localhost/127.0.0.1)');
  }
  if (parsed.port !== '55439') {
    throw new Error(`BLOCKED: MIGRATION_TEST_DATABASE_URL port must be 55439 (got ${parsed.port || 'default'})`);
  }
  return url.trim();
}

function getCanonicalClasses(): string[] {
  return [...MIGRATION_REGISTRY];
}

export { requireTestUrl, getCanonicalClasses };
