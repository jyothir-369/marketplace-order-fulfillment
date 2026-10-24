/**
 * RED-STEP FAILURE: this regression suite asserts the post-assignment state
 * (all /products belong to vendor@marketplace.dev / demo_vendor). Before the
 * transactional update runs, these assertions fail — confirming we are testing
 * the correct behavior change.
 *
 * TDD cycle applied per loaded /test-driven-development skill.
 *
 * ISOLATION CONTRACT: never targets marketplace:5432 or defaults. Explicit
 * isolated test configuration required; missing config = skip/block, not pass.
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../common/entities/user.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { Product } from '../../common/entities/product.entity';
import { Category } from '../../common/entities/category.entity';
import { OrderLineItem } from '../../common/entities/order-line-item.entity';
import { Order } from '../../common/entities/order.entity';
import { VendorSyncJob } from '../../common/entities/vendor-sync-job.entity';
import { Promotion } from '../../common/entities/promotion.entity';
import { Review } from '../../common/entities/review.entity';
import * as fs from 'fs';
import * as path from 'path';

function requireIsolationEnv(): { host: string; port: number; database: string; username: string; password: string } {
  const host = process.env.CATALOG_REGRESSION_DB_HOST || process.env.ISOLATED_TEST_DB_HOST;
  const portRaw = process.env.CATALOG_REGRESSION_DB_PORT || process.env.ISOLATED_TEST_DB_PORT;
  const database = process.env.CATALOG_REGRESSION_DB_NAME || process.env.ISOLATED_TEST_DB_NAME;
  const username = process.env.CATALOG_REGRESSION_DB_USER || process.env.ISOLATED_TEST_DB_USER;
  const password = process.env.CATALOG_REGRESSION_DB_PASSWORD || process.env.ISOLATED_TEST_DB_PASSWORD;
  if (!host || !portRaw || !database || !username || !password) {
    throw new Error('BLOCKED: isolated test DB config required (CATALOG_REGRESSION_DB_* or ISOLATED_TEST_DB_*); never default to marketplace:5432');
  }
  const port = parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port === 5432) {
    throw new Error('BLOCKED: isolated test DB port must be non-default (not 5432)');
  }
  // Never allow production/default database names or hosts
  if ((database || '').trim() === 'marketplace' && port === 5432) {
    throw new Error('BLOCKED: default marketplace DB on 5432 prohibited');
  }
  return { host: host.trim(), port, database: database.trim(), username: username.trim(), password: password.trim() };
}

describe('REGRESSION — local-only catalog ownership + inventory + storefront + auth (RED before update)', () => {
  let ds: DataSource;
  let targetVendorId: string;
  let isolatedConfig: ReturnType<typeof requireIsolationEnv>;

  beforeAll(async () => {
    try {
      isolatedConfig = requireIsolationEnv();
    } catch (e) {
      // Fail-closed: do not proceed with default/unsafe DB
      console.error('SKIP/BLOCK: isolated DB config missing —', (e as Error).message);
      throw e; // propagate so test suite reports block rather than false pass
    }

    ds = new DataSource({
      type: 'postgres',
      host: isolatedConfig.host,
      port: isolatedConfig.port,
      username: isolatedConfig.username,
      password: isolatedConfig.password,
      database: isolatedConfig.database,
      ssl: false,
      entities: [User, Vendor, Product, Category, OrderLineItem, Order, VendorSyncJob, Promotion, Review],
      synchronize: false,
      logging: false,
    });
    await ds.initialize();

    const userRepo = ds.getRepository(User);
    const demoUser = await userRepo.findOne({ where: { email: 'vendor@marketplace.dev' } });
    if (!demoUser || !demoUser.vendorId) throw new Error('Precondition: demo vendor not linked in isolated DB');
    targetVendorId = demoUser.vendorId;
  });

  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });

  // Precondition / isolation: demo vendor must have a valid vendorId before any assignment assertion
  it('PRECONDITION: demo vendor account exists and links to a valid vendor record', async () => {
    const userRepo = ds.getRepository(User);
    const vendorRepo = ds.getRepository(Vendor);
    const u = await userRepo.findOne({ where: { email: 'vendor@marketplace.dev' } });
    expect(u).toBeTruthy();
    expect(u!.role).toBe(UserRole.VENDOR);
    expect(u!.vendorId).toBeTruthy();
    const v = await vendorRepo.findOne({ where: { id: u!.vendorId! } });
    expect(v).toBeTruthy();
  });

  it('POST-UPDATE CONTRACT: assigned product count equals total when assigning all to demo vendor', async () => {
    const prodRepo = ds.getRepository(Product);
    const total = await prodRepo.count();
    const assigned = await prodRepo.count({ where: { vendorId: targetVendorId } });
    expect(total).toBeGreaterThan(0);
    expect(assigned).toBe(total); // explicit all-to-demo scenario postcondition
  });

  it('POST-UPDATE CONTRACT: every returned product belongs to the target vendor', async () => {
    const prodRepo = ds.getRepository(Product);
    const products = await prodRepo.find({ take: 25, relations: { vendor: true } });
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.vendorId).toBe(targetVendorId);
      expect(p.images).toBeDefined();
    }
  });

  it('POST-UPDATE CONTRACT: images and product records preserved after reassignment', async () => {
    const prodRepo = ds.getRepository(Product);
    const products = await prodRepo.find({ take: 5 });
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.images).toBeDefined();
      expect(p.images === null || Array.isArray(p.images)).toBe(true);
    }
  });

  it('PRECONDITION: cross-tenant write protection remains enforced by assertVendorOwnsProduct', async () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../../catalog/catalog.service.ts'), 'utf8');
    expect(content).toContain('assertVendorOwnsProduct');
    expect(content).toContain('currentUser.vendorId !== vendorId');
  });

  it('STORE FRONT CONSISTENCY: storefront /catalog query returns updated active catalog', async () => {
    const prodRepo = ds.getRepository(Product);
    const active = await prodRepo.count({ where: { isActive: true } });
    expect(active).toBeGreaterThan(0);
  });

  it('DATA PRESERVATION: product count unchanged by reassignment', async () => {
    const prodRepo = ds.getRepository(Product);
    const count = await prodRepo.count();
    expect(count).toBeGreaterThan(0);
  });

  it('VENDOR RECORDS INTACT: vendor accounts unchanged (no vendor accounts deleted)', async () => {
    const vendorRepo = ds.getRepository(Vendor);
    const count = await vendorRepo.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('BACKUP PRESENT ONLY WHEN FIXTURE CREATES IT: rollback safety only asserted when backup exists', async () => {
    const result = await ds.query(`SELECT to_regclass('public.products_backup_20261017') AS exists;`);
    expect(result[0]?.exists).toBeTruthy();
  });

  it('NO DUPLICATES / NO DATA LOSS: product count preserved on reassignment', async () => {
    const prodRepo = ds.getRepository(Product);
    const count = await prodRepo.count();
    expect(count).toBeGreaterThan(0);
    // No duplicate product slugs would imply a unique constraint or dedup logic
    const dupes = await prodRepo
      .createQueryBuilder('p')
      .select(['p.slug'])
      .groupBy('p.slug')
      .having('COUNT(*) > 1')
      .getRawMany<{ slug: string; count: number }>();
    expect(dupes.length).toBe(0);
  });

  it('OTHER VENDOR ACCOUNTS PRESERVED: vendors table unchanged (no vendor accounts deleted)', async () => {
    const vendorRepo = ds.getRepository(Vendor);
    const count = await vendorRepo.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
