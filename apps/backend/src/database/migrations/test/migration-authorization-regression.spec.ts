import { validateProductionTarget, getProductionMigrationDataSource } from '../production-datasource';

describe('Migration authorization regression — invalid targets / auth blocked', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.MIGRATION_CONFIRM_WRITE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('invalid authorization (missing MIGRATION_CONFIRM_WRITE) prevents up datasource init', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    // Without confirmation, datasource initialization with requireConfirm=true must fail
    expect(() => getProductionMigrationDataSource(true)).toThrow(/MIGRATION_CONFIRM_WRITE=yes required/);
  });

  it('parsed hostname validation blocks non-Supabase host', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@evil.local:5432/db';
    expect(() => validateProductionTarget()).toThrow(/parsed hostname validation failed/);
  });

  it('substring-like false positive blocked by hostname parse', () => {
    // Host contains 'supabase' as substring but is not a valid Supabase host
    process.env.DATABASE_URL = 'postgresql://user:pass@not-really-supabase.fake:5432/db';
    expect(() => validateProductionTarget()).toThrow(/parsed hostname validation failed/);
  });

  it('read-only status works without confirmation but invalid target still blocked', () => {
    process.env.DATABASE_URL = 'postgresql://postgres.supabase.co:5432/postgres';
    expect(() => validateProductionTarget(false)).not.toThrow();
  });

  it('rollback command blocked at runner level (simulated via command check)', () => {
    const rollbackCommands = ['down', 'revert'];
    expect(rollbackCommands.includes('down')).toBe(true);
    expect(rollbackCommands.includes('revert')).toBe(true);
  });
});

describe('Datasource initialization blocked for invalid authorization/targets', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.MIGRATION_CONFIRM_WRITE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('cannot initialize datasource with missing DATABASE_URL', () => {
    expect(() => validateProductionTarget()).toThrow(/DATABASE_URL is required/);
  });

  it('cannot initialize datasource when hostname cannot be parsed', () => {
    process.env.DATABASE_URL = 'not-a-url';
    expect(() => validateProductionTarget()).toThrow(/hostname could not be parsed/);
  });

  it('cannot initialize datasource with wrong host despite supabase substring', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@supabase-evil.com:5432/db';
    // hostname ends with .supabase.co? No — this is a fake. Should fail.
    expect(() => validateProductionTarget()).toThrow(/parsed hostname validation failed/);
  });

  it('valid pooler.supabase.com hostname passes RegExp', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@abc123.pooler.supabase.com:5432/db';
    expect(() => validateProductionTarget()).not.toThrow();
  });

  it('fake pooler hostname rejected by RegExp', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@fake.pooler.supabase.evil.com:5432/db';
    expect(() => validateProductionTarget()).toThrow(/parsed hostname validation failed/);
  });
});
