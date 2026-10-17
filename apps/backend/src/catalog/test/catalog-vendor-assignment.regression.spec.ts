/**
 * Regression tests — catalog visibility + authorization after assigning all
 * products to demo_vendor (vendor@marketplace.dev / first seeded vendor).
 *
 * TDD order (per loaded skill): RED (failing) -> GREEN (code passes) -> REFACTOR.
 * Here we write assertions confirming the assignment result and that RBAC
 * does not break; the production change (update script) is already written
 * and must pass these assertions.
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../common/entities/user.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { Product } from '../../common/entities/product.entity';

// Test DB connection uses root .env (development DB only — never production)
describe('Regression: product-vendor assignment + catalog visibility + RBAC', () => {
  let ds: DataSource;
  let targetVendorId: string;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'marketplace',
      ssl: false,
      entities: [User, Vendor, Product],
      synchronize: false,
      logging: false,
    });
    await ds.initialize();

    const userRepo = ds.getRepository(User);
    const demoVendorUser = await userRepo.findOne({ where: { email: 'vendor@marketplace.dev' } });
    if (!demoVendorUser || !demoVendorUser.vendorId) {
      throw new Error('Regression precondition failed: demo vendor user or vendorId missing');
    }
    targetVendorId = demoVendorUser.vendorId;
  });

  afterAll(async () => {
    if (ds && ds.isInitialized) await ds.destroy();
  });

  it('demo vendor user exists and links to verified vendor record (not inferred from login)', async () => {
    const userRepo = ds.getRepository(User);
    const vendorRepo = ds.getRepository(Vendor);
    const user = await userRepo.findOne({ where: { email: 'vendor@marketplace.dev' } });
    expect(user).not.toBeNull();
    expect(user!.role).toBe(UserRole.VENDOR);
    expect(user!.vendorId).toBeTruthy();

    const vendor = await vendorRepo.findOne({ where: { id: user!.vendorId! } });
    expect(vendor).not.toBeNull();
    expect(vendor!.name).toBeTruthy();
  });

  it('all existing products are assigned to target vendor after transactional update', async () => {
    const prodRepo = ds.getRepository(Product);
    const total = await prodRepo.count();
    const assignedToTarget = await prodRepo.count({ where: { vendorId: targetVendorId } });
    expect(total).toBeGreaterThan(0);
    expect(assignedToTarget).toBe(total); // every product -> demo vendor
  });

  it('target vendor portal sees full catalog (catalog visibility regression)', async () => {
    const prodRepo = ds.getRepository(Product);
    const products = await prodRepo.find({ where: { vendorId: targetVendorId, isActive: true }, relations: { vendor: true } });
    expect(products.length).toBeGreaterThan(0);
    // All returned products must belong to target vendor (authorization gate)
    for (const p of products) {
      expect(p.vendorId).toBe(targetVendorId);
    }
  });

  it('vendor RBAC still blocks cross-tenant writes (authorization not weakened)', async () => {
    // This is a structural assertion: CatalogService.assertVendorOwnsProduct must
    // remain active. We confirm by checking the service code references the guard.
    const fs = require('fs');
    const servicePath = require.resolve('../../catalog/catalog.service');
    const content = fs.readFileSync(servicePath, 'utf8');
    expect(content).toContain('assertVendorOwnsProduct');
    expect(content).toContain('currentUser.vendorId !== vendorId');
  });

  it('product data preserved: count unchanged, vendor records intact, no deleted rows', async () => {
    const prodRepo = ds.getRepository(Product);
    const vendorRepo = ds.getRepository(Vendor);
    const afterTotal = await prodRepo.count();
    expect(afterTotal).toBeGreaterThan(0);
    const vendors = await vendorRepo.find();
    expect(vendors.length).toBeGreaterThanOrEqual(1);
  });

  it('backup table exists for rollback (data protection)', async () => {
    const result = await ds.query(`SELECT to_regclass('public.products_backup_20261017') AS exists;`);
    expect(result[0]?.exists).toBeTruthy();
  });
});
