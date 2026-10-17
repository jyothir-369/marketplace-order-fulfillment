import { getProductionMigrationDataSource, validateProductionTarget } from '../production-datasource';

describe('Production datasource isolation and authorization (RED→GREEN)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.MIGRATION_CONFIRM_WRITE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('status: validates target without MIGRATION_CONFIRM_WRITE', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    // Must NOT throw — status is read-only
    expect(() => validateProductionTarget()).not.toThrow();
  });

  it('up: requires MIGRATION_CONFIRM_WRITE=yes', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    expect(() => validateProductionTarget(true)).toThrow(/explicit confirmation/);
  });

  it('up: passes with confirmation', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    process.env.MIGRATION_CONFIRM_WRITE = 'yes';
    expect(() => validateProductionTarget(true)).not.toThrow();
  });

  it('production datasource has full canonical migrations', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    process.env.MIGRATION_CONFIRM_WRITE = 'yes';
    const ds = getProductionMigrationDataSource();
    expect((Array.isArray(ds.options.migrations) ? ds.options.migrations.length : 0)).toBeGreaterThanOrEqual(25);
  });
});
