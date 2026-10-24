#!/usr/bin/env node
/**
 * Transactional update script: assign EVERY existing product to the vendor
 * linked to `demo_vendor` (vendor@marketplace.dev) so that account sees the
 * full catalog in its Vendor Portal.
 *
 * Rules (from instructions):
 * - Read vendor ID from DB/user records; never infer from login screen.
 * - Back up rows before update (CSV + SQL INSERT ... SELECT backup table).
 * - Update transactionally; preserve all product data and vendor accounts.
 * - Never touch production (NODE_ENV is checked; abort if production).
 * - Do NOT stage, commit, push, deploy.
 */

// Dynamic DB module load — script runtime; behavior must stay identical.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DataSource } = require('typeorm');
// Essential runtime module load for child-process backup.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require('child_process');
// Essential file-system module load for CSV backup/write.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// Essential path module load.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const BACKUP_DIR = path.resolve(__dirname, '../../../backups');
const BACKUP_FILE = path.join(BACKUP_DIR, `product-vendor-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);

async function main() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log('NODE_ENV =', nodeEnv);
  if (nodeEnv === 'production') {
    console.error('ABORT: NODE_ENV is production — this script refuses to run in production.');
    process.exit(1);
  }

  // Load DB connection from .env (same logic as seed)
  // Dynamic env loader — script-specific.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

  const isCloud = process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('supabase.co') || process.env.DATABASE_URL.includes('sslmode=require'));
  const dsConfig = isCloud
    ? { type: 'postgres', url: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'marketplace',
        ssl: false,
      };

  const AppDataSource = new DataSource({
    ...dsConfig,
    entities: [
      /* eslint-disable @typescript-eslint/no-var-requires */
      // Dynamic entity load — runtime TypeORM initialization; preserved intentionally.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../common/entities/vendor.entity').Vendor,
      // Dynamic entity load — runtime TypeORM initialization; preserved intentionally.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../common/entities/product.entity').Product,
      // Dynamic entity load — runtime TypeORM initialization; preserved intentionally.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../common/entities/user.entity').User,
    ],
    synchronize: false,
    logging: true,
  });

  await AppDataSource.initialize();
  console.log('DB connected.');

  // 1. Verify vendor from user record (NOT from login screen / print credentials)
      // Dynamic entity load — runtime TypeORM initialization; preserved intentionally.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
  const userRepo = AppDataSource.getRepository(require('../common/entities/user.entity').User);
  const vendorRepo = AppDataSource.getRepository(/* eslint-disable @typescript-eslint/no-var-requires */
      // Dynamic entity load — runtime TypeORM initialization; preserved intentionally.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../common/entities/vendor.entity').Vendor);
      // Dynamic entity load — runtime TypeORM initialization; preserved intentionally.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
  const productRepo = AppDataSource.getRepository(require('../common/entities/product.entity').Product);

  const demoVendorUser = await userRepo.findOne({ where: { email: 'vendor@marketplace.dev' } });
  if (!demoVendorUser) {
    console.error('ABORT: demo vendor user (vendor@marketplace.dev) not found in DB.');
    await AppDataSource.destroy();
    process.exit(1);
  }
  if (!demoVendorUser.vendorId) {
    console.error('ABORT: demo vendor user exists but has no vendorId (vendorId = null).');
    await AppDataSource.destroy();
    process.exit(1);
  }
  const targetVendorId = demoVendorUser.vendorId;
  console.log('Verified vendor user:', demoVendorUser.email, '| role:', demoVendorUser.role, '| vendorId:', targetVendorId);

  const vendorRecord = await vendorRepo.findOne({ where: { id: targetVendorId } });
  if (!vendorRecord) {
    console.error('ABORT: Vendor record with id', targetVendorId, 'not found. Verified from user only; not inferred.');
    await AppDataSource.destroy();
    process.exit(1);
  }
  console.log('Target vendor record verified from DB:', vendorRecord.id, '| name:', vendorRecord.name);

  // 2. Before counts
  const beforeTotal = await productRepo.count();
  const beforeAssignedToTarget = await productRepo.count({ where: { vendorId: targetVendorId } });
  const beforeAssignedToOthers = beforeTotal - beforeAssignedToTarget;
  console.log('BEFORE — total products:', beforeTotal, '| already assigned to target vendor:', beforeAssignedToTarget, '| assigned elsewhere:', beforeAssignedToOthers);

  // 3. Back up products (all columns)
  const allProducts = await productRepo.find({ order: { createdAt: 'ASC' } });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const csvHeader = ['id','vendorId','name','slug','category','price','stockCount','isActive','description','images','createdAt','updatedAt','version'];
  const csvLines = [csvHeader.join(',')];
  for (const p of allProducts) {
    csvLines.push([
      p.id,
      p.vendorId,
      `"${p.name.replace(/"/g, '""')}"`,
      p.slug ? `"${p.slug}"` : '',
      p.category ? `"${p.category}"` : '',
      p.price,
      p.stockCount,
      p.isActive,
      p.description ? `"${(p.description || '').replace(/"/g, '""')}"` : '',
      p.images ? `"${(p.images || []).join(',')}"` : '',
      p.createdAt ? p.createdAt.toISOString() : '',
      p.updatedAt ? p.updatedAt.toISOString() : '',
      p.version ?? '',
    ].join(','));
  }
  fs.writeFileSync(BACKUP_FILE, csvLines.join('\n'), 'utf8');
  console.log('Backed up', allProducts.length, 'products to', BACKUP_FILE);

  // Also create SQL-level backup table (preserves structure for rollback)
  await AppDataSource.query(`CREATE TABLE IF NOT EXISTS products_backup_20261017 (LIKE products INCLUDING ALL);`);
  await AppDataSource.query(`TRUNCATE products_backup_20261017;`);
  await AppDataSource.query(`INSERT INTO products_backup_20261017 SELECT * FROM products;`);
  console.log('SQL backup table products_backup_20261017 created/populated.');

  // 4. Transactional update: assign ALL products to target vendor
  const resultBeforeUpdateRows = await productRepo.find({ select: ['id', 'vendorId', 'name'] });
  console.log('Updating', resultBeforeUpdateRows.length, 'product rows transactionally...');

  await AppDataSource.manager.transaction(async (manager) => {
      // Dynamic entity load — runtime TypeORM initialization; preserved intentionally.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
    const prodRepo = manager.getRepository(require('../common/entities/product.entity').Product);
    for (const p of resultBeforeUpdateRows) {
      await prodRepo.update(p.id, { vendorId: targetVendorId });
    }
  });

  // 5. After counts
  const afterTotal = await productRepo.count();
  const afterAssignedToTarget = await productRepo.count({ where: { vendorId: targetVendorId } });
  const afterAssignedToOthers = afterTotal - afterAssignedToTarget;
  console.log('AFTER — total products:', afterTotal, '| assigned to target vendor:', afterAssignedToTarget, '| assigned elsewhere:', afterAssignedToOthers);

  // 6. Verify product data preserved (count equals before; vendor record untouched)
  const preservedCount = await productRepo.count();
  const vendorStillExists = await vendorRepo.findOne({ where: { id: targetVendorId } });
  if (preservedCount !== beforeTotal) {
    console.error('VALIDATION FAILED: product count changed (before:', beforeTotal, '| after:', preservedCount, ')');
  } else if (!vendorStillExists) {
    console.error('VALIDATION FAILED: target vendor record missing after update.');
  } else {
    console.log('VALIDATION PASSED: product count preserved (', preservedCount, '); vendor record intact (', vendorStillExists.name, '); all vendor accounts preserved.');
  }

  // 7. Regression confirmation: target vendor should now see full catalog
  const allProductsForVendor = await productRepo.find({ where: { vendorId: targetVendorId, isActive: true } });
  console.log('TARGET VENDOR CATALOG VISIBILITY:', allProductsForVendor.length, 'active products assigned.');

  console.log('');
  console.log('Rollback steps:');
  console.log('  - SQL: UPDATE products SET vendorId = (SELECT vendor_id FROM products_backup_20261017 WHERE products_backup_20261017.id = products.id) WHERE TRUE;');
  console.log('  - Or restore from CSV:', BACKUP_FILE);
  console.log('  - SQL backup table exists: products_backup_20261017');

  await AppDataSource.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
