import 'reflect-metadata';
require('dotenv').config({ path: require('path').join(__dirname, '../../../../.env') });
import { DataSource } from 'typeorm';
import * as entities from '../common/entities';
import { Vendor } from '../common/entities/vendor.entity';
import { Product } from '../common/entities/product.entity';

function parsePostgresUrl(url: string): {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    ssl: !parsed.searchParams.get('sslmode')?.includes('disable'),
  };
}

const databaseUrl = process.env.DATABASE_URL;
const parsedUrl = databaseUrl ? parsePostgresUrl(databaseUrl) : null;

const AppDataSource = new DataSource({
  type: 'postgres',
  host: parsedUrl?.host ?? (process.env.DB_HOST || 'localhost'),
  port: parsedUrl?.port ?? parseInt(process.env.DB_PORT || '5433'),
  username: parsedUrl?.username ?? (process.env.DB_USERNAME || 'postgres'),
  password: parsedUrl?.password ?? (process.env.DB_PASSWORD || 'postgres'),
  database: parsedUrl?.database ?? (process.env.DB_DATABASE || 'marketplace'),
  ssl: parsedUrl ? (parsedUrl.ssl ? { rejectUnauthorized: false } : false) : undefined,
  entities: Object.values(entities) as Function[],
  synchronize: true,
  logging: false,
});
interface VendorSeed {
  name: string;
  category: string;
  products: Array<{
    name: string;
    price: number;
    stockCount: number;
  }>;
}

const vendorSeeds: VendorSeed[] = [
  {
    name: 'Electronics World',
    category: 'Electronics',
    products: [
      { name: 'Wireless Headphones', price: 79.99, stockCount: 50 },
      { name: 'Bluetooth Speaker', price: 49.99, stockCount: 100 },
      { name: 'USB-C Hub', price: 39.99, stockCount: 75 },
      { name: 'Mechanical Keyboard', price: 129.99, stockCount: 30 },
      { name: 'Gaming Mouse', price: 59.99, stockCount: 60 },
    ],
  },
  {
    name: 'Home & Kitchen Co',
    category: 'Home & Living',
    products: [
      { name: 'Coffee Maker', price: 89.99, stockCount: 40 },
      { name: 'Air Fryer', price: 149.99, stockCount: 25 },
      { name: 'Blender Pro', price: 69.99, stockCount: 55 },
      { name: 'Instant Pot', price: 99.99, stockCount: 35 },
      { name: 'Knife Set', price: 79.99, stockCount: 45 },
    ],
  },
  {
    name: 'Sports Gear Inc',
    category: 'Apparel',
    products: [
      { name: 'Yoga Mat Premium', price: 34.99, stockCount: 120 },
      { name: 'Resistance Bands', price: 19.99, stockCount: 200 },
      { name: 'Dumbbell Set 20lb', price: 49.99, stockCount: 80 },
      { name: 'Running Shoes', price: 119.99, stockCount: 40 },
      { name: 'Water Bottle', price: 24.99, stockCount: 150 },
    ],
  },
  {
    name: 'Fashion Forward',
    category: 'Apparel',
    products: [
      { name: 'Cotton T-Shirt', price: 24.99, stockCount: 500 },
      { name: 'Denim Jeans', price: 59.99, stockCount: 200 },
      { name: 'Leather Belt', price: 34.99, stockCount: 150 },
      { name: 'Sneakers Classic', price: 79.99, stockCount: 100 },
      { name: 'Wool Sweater', price: 89.99, stockCount: 75 },
    ],
  },
  {
    name: 'Books & Media',
    category: 'Books',
    products: [
      { name: 'Bestseller Novel', price: 14.99, stockCount: 300 },
      { name: 'Cookbook Collection', price: 29.99, stockCount: 100 },
      { name: 'Programming Guide', price: 49.99, stockCount: 80 },
      { name: 'Art Print A4', price: 19.99, stockCount: 200 },
      { name: 'Board Game', price: 39.99, stockCount: 60 },
    ],
  },
];

async function seedDatabase(): Promise<void> {
  console.log('='.repeat(60));
  console.log('DATABASE SEED SCRIPT - Phase 9 Implementation');
  console.log('='.repeat(60));
  console.log('');

  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    console.log('Database connection established');
    console.log('');

    console.log('Clearing existing data...');
    await AppDataSource.createQueryBuilder().delete().from(Product).execute();
    await AppDataSource.createQueryBuilder().delete().from(Vendor).execute();
    console.log('Existing data cleared');
    console.log('');

    let totalProducts = 0;
    const vendorMap = new Map<string, { vendor: Vendor; products: Product[] }>();

    for (const vendorSeed of vendorSeeds) {
      console.log('Creating vendor: ' + vendorSeed.name);

      const vendorRepo = AppDataSource.getRepository(Vendor);
      const productRepo = AppDataSource.getRepository(Product);

      const vendor = vendorRepo.create({ name: vendorSeed.name });
      const savedVendor = await vendorRepo.save(vendor);
      console.log('  - Vendor ID: ' + savedVendor.id);

      const products: Product[] = [];
      for (const productSeed of vendorSeed.products) {
        const product = productRepo.create({
          vendorId: savedVendor.id,
          name: productSeed.name,
          price: productSeed.price,
          stockCount: productSeed.stockCount,
          category: vendorSeed.category,
          isActive: true,
        });
        const savedProduct = await productRepo.save(product);
        products.push(savedProduct);
        totalProducts++;
        console.log('    + ' + productSeed.name + ' (Stock: ' + productSeed.stockCount + ', Price: $' + productSeed.price + ')');
      }

      vendorMap.set(savedVendor.id, { vendor: savedVendor, products });
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('SEED SUMMARY');
    console.log('='.repeat(60));
    console.log('Total Vendors Created: ' + vendorSeeds.length);
    console.log('Total Products Created: ' + totalProducts);
    console.log('');

    console.log('INVENTORY SUMMARY BY VENDOR:');
    console.log('-'.repeat(50));
    for (const [vendorId, data] of vendorMap.entries()) {
      const totalStock = data.products.reduce((sum, p) => sum + p.stockCount, 0);
      const totalValue = data.products.reduce((sum, p) => sum + (Number(p.price) * p.stockCount), 0);
      console.log(data.vendor.name + ':');
      console.log('  Products: ' + data.products.length);
      console.log('  Total Stock: ' + totalStock + ' units');
      console.log('  Total Value: $' + totalValue.toFixed(2));
      console.log('');
    }

    const grandTotalStock = Array.from(vendorMap.values())
      .reduce((sum, data) => sum + data.products.reduce((s, p) => s + p.stockCount, 0), 0);
    const grandTotalValue = Array.from(vendorMap.values())
      .reduce((sum, data) => sum + data.products.reduce((s, p) => s + (Number(p.price) * p.stockCount), 0), 0);

    console.log('GRAND TOTAL:');
    console.log('  Total Stock: ' + grandTotalStock + ' units');
    console.log('  Total Value: $' + grandTotalValue.toFixed(2));
    console.log('');
    console.log('Database seeding completed successfully!');
    console.log('');
    console.log('Ready for load testing!');
    console.log('Run: npm run load-test');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

seedDatabase()
  .then(() => {
    console.log('Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
