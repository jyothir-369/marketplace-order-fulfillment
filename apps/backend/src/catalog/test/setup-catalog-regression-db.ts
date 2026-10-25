import 'reflect-metadata';
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
import { assertCatalogRegressionDB } from './catalog-regression-db-guard';

async function main() {
  const cfg = {
    host: process.env.CATALOG_REGRESSION_DB_HOST,
    port: Number(process.env.CATALOG_REGRESSION_DB_PORT),
    database: process.env.CATALOG_REGRESSION_DB_NAME,
    username: process.env.CATALOG_REGRESSION_DB_USER,
    password: process.env.CATALOG_REGRESSION_DB_PASSWORD,
  };

  assertCatalogRegressionDB(cfg);

  if (
    cfg.host !== '127.0.0.1' ||
    cfg.port !== 55439 ||
    cfg.database !== 'catalog_red_test' ||
    cfg.username !== 'migrationtest'
  ) {
    throw new Error('Refusing setup: expected only local catalog_red_test on port 55439.');
  }

  const ds = new DataSource({
    type: 'postgres',
    ...cfg,
    ssl: false,
    entities: [User, Vendor, Product, Category, OrderLineItem, Order, VendorSyncJob, Promotion, Review],
    synchronize: true,
    dropSchema: false,
    logging: false,
  });

  try {
    await ds.initialize();

    const vendorRepo = ds.getRepository(Vendor);
    const userRepo = ds.getRepository(User);
    const categoryRepo = ds.getRepository(Category);
    const productRepo = ds.getRepository(Product);

    let category = await categoryRepo.findOne({ where: { name: 'Regression Test' } });
    if (!category) {
      category = await categoryRepo.save(categoryRepo.create({
        name: 'Regression Test',
        slug: 'regression-test',
        description: 'Isolated catalog regression fixture',
      }));
    }

    let vendorUser = await userRepo.findOne({ where: { email: 'vendor@marketplace.dev' } });
    let vendor: Vendor;

    if (vendorUser?.vendorId) {
      const existingVendor = await vendorRepo.findOne({ where: { id: vendorUser.vendorId } });
      if (!existingVendor) {
        throw new Error('Existing demo user references a missing vendor; refusing to rewrite it.');
      }
      vendor = existingVendor;
    } else {
      vendor = await vendorRepo.save(vendorRepo.create({ name: 'Regression Demo Vendor' }));
      if (vendorUser) {
        vendorUser.vendorId = vendor.id;
        vendorUser.role = UserRole.VENDOR;
        await userRepo.save(vendorUser);
      } else {
        vendorUser = await userRepo.save(userRepo.create({
          email: 'vendor@marketplace.dev',
          passwordHash: 'regression-fixture-not-for-login',
          role: UserRole.VENDOR,
          vendorId: vendor.id,
          displayName: 'Regression Demo Vendor',
        }));
      }
    }

    const existingProducts = await productRepo.count();
    if (existingProducts === 0) {
      await productRepo.save([
        productRepo.create({
          vendorId: vendor.id,
          name: 'Regression Product One',
          slug: 'regression-product-one',
          category: category.name,
          price: 19.99,
          description: 'Isolated regression fixture',
          images: [],
          stockCount: 10,
          isActive: true,
        }),
        productRepo.create({
          vendorId: vendor.id,
          name: 'Regression Product Two',
          slug: 'regression-product-two',
          category: category.name,
          price: 29.99,
          description: 'Isolated regression fixture',
          images: [],
          stockCount: 5,
          isActive: true,
        }),
      ]);
    } else {
      const unassigned = await productRepo.count({ where: { vendorId: vendor.id } });
      if (unassigned !== existingProducts) {
        throw new Error(
          'Catalog already contains products not assigned to the demo vendor. ' +
          'Refusing to rewrite existing fixture data; use a fresh isolated test database.'
        );
      }
    }

    await ds.query(`
      CREATE TABLE IF NOT EXISTS public.products_backup_20261017
      (LIKE public.products INCLUDING ALL)
    `);

    console.log('Catalog regression schema and demo fixtures are ready.');
    console.log(`Vendor ID: ${vendor.id}`);
    console.log(`Product count: ${await productRepo.count()}`);
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((error) => {
  console.error('Catalog regression setup failed:', error.message);
  process.exitCode = 1;
});
