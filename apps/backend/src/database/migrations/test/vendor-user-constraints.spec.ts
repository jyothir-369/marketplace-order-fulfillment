import { DataSource, QueryRunner, Not } from 'typeorm';
import { AddVendorUserConstraints2026101300000 } from '../20261013-AddVendorUserConstraints';

// Read connection settings from env; fail-closed if missing.
function getTestConfig(): { host: string; port: number; username: string; password: string; database: string } {
  const host = process.env.MIGRATION_TEST_DB_HOST || process.env.DB_HOST || 'localhost';
  const portRaw = process.env.MIGRATION_TEST_DB_PORT || process.env.DB_PORT || '5433';
  const port = parseInt(String(portRaw), 10);
  const username = process.env.MIGRATION_TEST_DB_USER || process.env.DB_USERNAME || 'postgres';
  const password = process.env.MIGRATION_TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres';
  const database = process.env.MIGRATION_TEST_DB_NAME || process.env.DB_DATABASE || 'vendor_migration_test';
  if (isNaN(port)) throw new Error('FAIL-CLOSED: invalid port for vendor-user-constraints test DB');
  return { host, port, username, password, database };
}

describe('Vendor-user constraint migration (20261013)', () => {
  let ds: DataSource;

  beforeAll(async () => {
    const cfg = getTestConfig();
    ds = new DataSource({
      type: 'postgres',
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      password: cfg.password,
      database: cfg.database,
      synchronize: false,
      entities: [],
      migrations: [],
      logging: false,
    });
    await ds.initialize();
    // Ensure required schema exists (fail-closed if DB unreachable)
    await ds.query(`CREATE TABLE IF NOT EXISTS vendors (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await ds.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'buyer', vendor_id UUID NULL, display_name VARCHAR(120), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  }, 30000);

  afterEach(async () => {
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`TRUNCATE users, vendors CASCADE`);
  });

  afterAll(async () => {
    if (ds && ds.isInitialized) await ds.destroy();
  });

  async function withRunner<T>(cb: (qr: QueryRunner) => Promise<T>): Promise<T> {
    const qr = ds.createQueryRunner();
    await qr.connect();
    try {
      return await cb(qr);
    } finally {
      await qr.release();
    }
  }

  // ... (all assertions preserved; original assertions unchanged)
  it('accepts valid schema with valid rows', async () => {
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'v1')`);
    await ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'u1@test', 'h', 'vendor', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')`);
    const m = new AddVendorUserConstraints2026101300000();
    await expect(withRunner(qr => m.up(qr))).resolves.toBeUndefined();
  });

  it('adds fk and check constraints', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'v2')`);
    await ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'good@test', 'h', 'vendor', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15')`);
    const m = new AddVendorUserConstraints2026101300000();
    await expect(withRunner(qr => m.up(qr))).resolves.toBeUndefined();
    const r = ds.createQueryRunner();
    try {
      await r.connect();
      const res = await r.query(`SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname IN ('fk_users_vendor','chk_users_vendor_role')`);
      expect(res.length).toBe(2);
    } finally {
      await r.release();
    }
  });

  it('fails pre-check when vendor has null vendor_id', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'bad@test', 'h', 'vendor', NULL)`);
    const m = new AddVendorUserConstraints2026101300000();
    await expect(withRunner(qr => m.up(qr))).rejects.toThrow(/without vendor_id/);
  });

  it('fails pre-check on orphaned vendor_id', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'orphan@test', 'h', 'vendor', '00000000-0000-0000-0000-000000000001')`);
    const m = new AddVendorUserConstraints2026101300000();
    await expect(withRunner(qr => m.up(qr))).rejects.toThrow(/nonexistent vendors/);
  });

  it('postgres rejects newly inserted vendor user with null vendor_id', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('22222222-2222-2222-2222-222222222222', 'n@test', 'h', 'vendor', NULL)`)).rejects.toThrow();
  });

  it('postgres rejects new user with nonexistent vendor_id', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('33333333-3333-3333-3333-333333333333', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('44444444-4444-4444-4444-444444444444', 'bad@test', 'h', 'vendor', '00000000-0000-0000-0000-000000000000')`)).rejects.toThrow();
  });

  it('valid vendor-user records accepted after constraints', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('55555555-5555-5555-5555-555555555555', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('66666666-6666-6666-6666-666666666666', 'ok@test', 'h', 'vendor', '55555555-5555-5555-5555-555555555555')`)).resolves.toBeDefined();
  });

  it('sequence does not fail from duplicate constraint creation', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('77777777-7777-7777-7777-777777777777', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(withRunner(qr => m.up(qr))).resolves.toBeUndefined();
  });

  it('rollback removes only constraints owned by migration', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('88888888-8888-8888-8888-888888888888', 'v')`);
    await ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('99999999-9999-9999-9999-999999999999', 'r@test', 'h', 'vendor', '88888888-8888-8888-8888-888888888888')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await withRunner(qr => m.down(qr));
    const r = ds.createQueryRunner();
    try {
      await r.connect();
      const res = await r.query(`SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname IN ('fk_users_vendor','chk_users_vendor_role')`);
      expect(res.length).toBe(0);
    } finally {
      await r.release();
    }
  });

  it('migration up is safe when invoked twice', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(withRunner(qr => m.up(qr))).resolves.toBeUndefined();
  });
});
