/*
 * Migration integration tests â€” canonical 26 migration classes.
 * Uses actual PostgreSQL at MIGRATION_TEST_DATABASE_URL (loopback:55439).
 */

import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { DataSource } from 'typeorm';
import { requireTestUrl, getCanonicalClasses } from './harness';

describe('Migration integration harness (canonical 26)', () => {
  const DATABASE_URL = requireTestUrl();
  describe('env validation', () => {
    it('MIGRATION_TEST_DATABASE_URL set explicitly', () => {
      expect(process.env.MIGRATION_TEST_DATABASE_URL).toBeTruthy();
    });
    it('points to loopback port 55439', () => {
      expect(DATABASE_URL).toContain(':55439');
    });
    it('canonical registry has 26 migrations', () => {
      expect(getCanonicalClasses()).toHaveLength(26);
    });
  });
});
