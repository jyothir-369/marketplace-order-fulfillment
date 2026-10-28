import { DataSource, QueryRunner, Not } from 'typeorm';
import { AddVendorUserConstraints2026101300000 } from '../20261013-AddVendorUserConstraints';

// Read connection settings from env; fail-closed if missing.
function getTestConfig(): {
  host: string;
  port: number;
  url?: string;
  username: string;
  password: string;
  database: string;
} {
  const host = process.env.MIGRATION_TEST_DB_HOST;
  const portRaw = process.env.MIGRATION_TEST_DB_PORT;
  const username = process.env.MIGRATION_TEST_DB_USER;
  const password = process.env.MIGRATION_TEST_DB_PASSWORD;
  const database = process.env.MIGRATION_TEST_DB_NAME;

  const url = (process.env.MIGRATION_CONSTRAINTS_TEST_DATABASE_URL || '').trim();
  if (!url) throw new Error('FAIL-CLOSED: MIGRATION_CONSTRAINTS_TEST_DATABASE_URL required explicitly');
  let parsed; try { parsed = new URL(url); } catch { throw new Error('BLOCKED: invalid URL'); }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') throw new Error('BLOCKED: bad protocol');
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') throw new Error('BLOCKED: non-loopback');
  if (!parsed.username || !parsed.password) throw new Error('BLOCKED: missing credentials');
  if (parsed.search || parsed.hash) throw new Error('BLOCKED: query/fragment');
  const portNum = parseInt(parsed.port || '0', 10);
  if (!portNum || portNum < 1024) throw new Error('BLOCKED: bad port');
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName || dbName === 'postgres' || dbName === 'template1' || dbName === 'template0') throw new Error('BLOCKED: protected DB');
  return { host: parsed.hostname, port: portNum, username: parsed.username, password: parsed.password, database: dbName, url };
}
describe('Vendor-user constraint migration (20261013)', () => {
  let ds: DataSource;

  beforeAll(async () => {
    const cfg = getTestConfig();
    ds = new DataSource({
      type: 'postgres',
      url: (cfg as any).url || ('postgres://' + cfg.username + ':' + cfg.password + '@' + cfg.host + ':' + cfg.port + '/' + cfg.database),
      synchronize: false,
      entities: [],
      migrations: [],
      logging: false,
    });
    await ds.initialize();

    // Verify the actual database before creating tables or running destructive test cleanup.
    const identity = await ds.query(
      'SELECT current_database() AS database',
    );

    const expectedDb = cfg.database;
    if (identity[0]?.database !== expectedDb) {
      await ds.destroy();
      throw new Error('FAIL-CLOSED: connected to unexpected DB: ' + (identity[0]?.database || 'none') + ' (expected ' + expectedDb + ')');
    }

    // The URL port is the host-published port; PostgreSQL reports its
    // internal listening port, commonly 5432 inside a Docker container.
    const serverPortRes = await ds.query("SELECT inet_server_port() AS port");
    const serverPort = serverPortRes[0]?.port
      ? parseInt(String(serverPortRes[0].port), 10)
      : null;

    if (!serverPort || serverPort < 1 || serverPort > 65535) {
      throw new Error(
        'FAIL-CLOSED: PostgreSQL server port could not be verified',
      );
    }

    const parsedUrl = new URL(cfg.url || '');
    const urlPort = parseInt(parsedUrl.port || '5432', 10);

    if (urlPort !== cfg.port) {
      throw new Error(
        'FAIL-CLOSED: configured port does not match the database URL port',
      );
    }
    // Fail-closed: teardown must not touch protected DBs
    const protectedCheck = await ds.query("SELECT current_database() AS db");
    const dbNow = protectedCheck[0]?.db;
    if (dbNow === 'postgres' || dbNow === 'template1' || dbNow === 'template0') throw new Error('FAIL-CLOSED: protected DB detected before setup');

    // Ensure required schema exists (fail-closed if DB unreachable)
    await ds.query(`CREATE TABLE IF NOT EXISTS vendors (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await ds.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'buyer', vendor_id UUID NULL, display_name VARCHAR(120), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  }, 30000);

  afterEach(async () => {
    if (!ds || !ds.isInitialized) return;
    // Drop both the named constraint (migration) and TypeORM-generated FK name.
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`TRUNCATE users, vendors CASCADE`);
  });

  afterAll(async () => {
if (ds && ds.isInitialized) {
        const protect = await ds.query("SELECT current_database() AS db");
        const dbName = protect[0]?.db;
        if (dbName === 'postgres' || dbName === 'template1' || dbName === 'template0') {
          await ds.destroy(); // just disconnect, do not drop
          throw new Error('FAIL-CLOSED: teardown blocked on protected DB: '+dbName);
        }
        await ds.destroy();
      }
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
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
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
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'bad@test', 'h', 'vendor', NULL)`);
    const m = new AddVendorUserConstraints2026101300000();
    await expect(withRunner(qr => m.up(qr))).rejects.toThrow(/without vendor_id/);
  });

  it('fails pre-check on orphaned vendor_id', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'orphan@test', 'h', 'vendor', '00000000-0000-0000-0000-000000000001')`);
    const m = new AddVendorUserConstraints2026101300000();
    await expect(withRunner(qr => m.up(qr))).rejects.toThrow(/nonexistent vendors/);
  });

  it('postgres rejects newly inserted vendor user with null vendor_id', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('22222222-2222-2222-2222-222222222222', 'n@test', 'h', 'vendor', NULL)`)).rejects.toThrow();
  });

  it('postgres rejects new user with nonexistent vendor_id', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('33333333-3333-3333-3333-333333333333', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('44444444-4444-4444-4444-444444444444', 'bad@test', 'h', 'vendor', '00000000-0000-0000-0000-000000000000')`)).rejects.toThrow();
  });

  it('valid vendor-user records accepted after constraints', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('55555555-5555-5555-5555-555555555555', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(ds.query(`INSERT INTO users (id, email, password_hash, role, vendor_id) VALUES ('66666666-6666-6666-6666-666666666666', 'ok@test', 'h', 'vendor', '55555555-5555-5555-5555-555555555555')`)).resolves.toBeDefined();
  });

  it('sequence does not fail from duplicate constraint creation', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('77777777-7777-7777-7777-777777777777', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(withRunner(qr => m.up(qr))).resolves.toBeUndefined();
  });

  it('rollback removes only constraints owned by migration', async () => {
    await ds.query(`TRUNCATE users, vendors CASCADE`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
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
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_id_fkey`);
    await ds.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await ds.query(`INSERT INTO vendors (id, name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v')`);
    const m = new AddVendorUserConstraints2026101300000();
    await withRunner(qr => m.up(qr));
    await expect(withRunner(qr => m.up(qr))).resolves.toBeUndefined();
  });
});
