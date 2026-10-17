import { getProductionMigrationDataSource, validateProductionTarget } from '../production-datasource';
import { DUPLICATE_TIMESTAMPS } from '../registry';

describe('Production datasource architecture (RED)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.MIGRATION_CONFIRM_WRITE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // RED 1: must load root .env before validating
  it('fails when DATABASE_URL missing (test-only datasource does not load .env)', () => {
    // Without root .env loaded, DATABASE_URL missing => must throw
    expect(() => validateProductionTarget()).toThrow(/DATABASE_URL is required/);
  });

  // RED 2: must require Supabase target
  it('rejects non-Supabase DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.MIGRATION_CONFIRM_WRITE = 'yes';
    expect(() => validateProductionTarget()).toThrow(/must target a Supabase/);
  });

  // RED 3a: status (no confirmation) must work
  it('read-only status works without MIGRATION_CONFIRM_WRITE', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    expect(() => validateProductionTarget()).not.toThrow();
  });

  // RED 3b: up (with confirmation=true) must reject missing MIGRATION_CONFIRM_WRITE
  it('up requires MIGRATION_CONFIRM_WRITE=yes', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    expect(() => validateProductionTarget(true)).toThrow(/explicit confirmation required/);
  });

  // RED 3c: up passes with confirmation
  it('up passes with MIGRATION_CONFIRM_WRITE=yes', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    process.env.MIGRATION_CONFIRM_WRITE = 'yes';
    expect(() => validateProductionTarget(true)).not.toThrow();
  });

  // GREEN 4: confirmation accepted
  it('accepts valid Supabase DATABASE_URL with confirmation', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    process.env.MIGRATION_CONFIRM_WRITE = 'yes';
    expect(() => validateProductionTarget()).not.toThrow();
  });

  // GREEN 5: distinct class names preserved despite timestamp ties (registry check)
  it('preserves duplicate-timestamp class names', () => {
    expect(DUPLICATE_TIMESTAMPS).toContain('1710000000005');
    expect(DUPLICATE_TIMESTAMPS).toContain('2026101300000');
  });
});
