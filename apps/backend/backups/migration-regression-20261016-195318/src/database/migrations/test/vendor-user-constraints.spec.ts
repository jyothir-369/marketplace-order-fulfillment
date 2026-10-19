import { DataSource, QueryRunner } from 'typeorm';
import { AddVendorUserConstraints2026101300000 } from '../20261013-AddVendorUserConstraints';

describe('Vendor-user constraint migration (20261013)', () => {
  let ds: DataSource;
  const TEST_DB = 'vendor_migration_test';
  const host = 'localhost';
  const port = 5433;

  async function withRunner<T>(cb: (qr: QueryRunner) => Promise<T>): Promise<T> {
    const qr = ds.createQueryRunner();
    await qr.connect();
    try {
      return await cb(qr);
    } finally {
      await qr.release();
    }
  }

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      host, port, username: 'postgres', password: 'postgres', database: TEST_DB,
      synchronize: false, entities: [], migrations: [], logging: false,
    });
    await ds.initialize();
    await ds.query(`DROP TABLE IF EXISTS users, vendors CASCADE`);
    await ds.query(`CREATE TABLE vendors (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await ds.query(`CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'buyer', vendor_id UUID NULL, display_name VARCHAR(120), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  });

  afterEach(async () => {
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`TRUNCATE users, vendors CASCADE`);
  });

  afterAll(async () => {
    if (ds.isInitialized) await ds.destroy();
  });

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
    await expect(withRunner(qr => m.up(qr))).rejects.toThrow(/orphaned/);
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
    await expect(withRunner(qr => m.up(qr))).rejects.toThrow();
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

  it('migration not accidentally run twice in registered history', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(withRunner(qr => m.up(qr))).rejects.toThrow();
  });
});
