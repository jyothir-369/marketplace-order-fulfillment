const { DataSource, Repository } = require('typeorm');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

// Import compiled entities
const { Product } = require('./dist/common/entities/product.entity.js');
const { Vendor } = require('./dist/common/entities/vendor.entity.js');
const { Category } = require('./dist/common/entities/category.entity.js');
const { User } = require('./dist/common/entities/user.entity.js');
const { Order } = require('./dist/common/entities/order.entity.js');
const { OrderLineItem } = require('./dist/common/entities/order-line-item.entity.js');
const { VendorSyncJob } = require('./dist/common/entities/vendor-sync-job.entity.js');

async function main() {
  const url = process.env.DATABASE_URL;
  const ds = new DataSource({
    type: 'postgres',
    url,
    entities: [Product, Vendor, Category, User, Order, OrderLineItem, VendorSyncJob],
    ssl: url && (url.includes('supabase.co') || url.includes('sslmode=require')) ? { rejectUnauthorized: false } : false,
    synchronize: false,
  });
  await ds.initialize();
  console.log('DB connected');

  const productRepo = ds.getRepository(Product);
  const count = await productRepo.count();
  console.log('Current product count:', count);

  if (count === 0) {
    // Insert minimal demo products
    const vendors = await ds.getRepository(Vendor).find();
    if (vendors.length === 0) {
      const vRepo = ds.getRepository(Vendor);
      vendors.push(await vRepo.save(vRepo.create({ name: 'Demo Vendor' })));
    }
    const pRepo = ds.getRepository(Product);
    await pRepo.save(pRepo.create({
      vendorId: vendors[0].id,
      name: 'Sample Product',
      slug: 'sample-product',
      category: 'Electronics',
      price: 99.99,
      stockCount: 10,
      isActive: true,
    }));
    console.log('Seeded 1 demo product');
  } else {
    console.log('Products already exist, skipping seed');
  }
  await ds.destroy();
}
main().catch(err => { console.error(err); process.exit(1); });
