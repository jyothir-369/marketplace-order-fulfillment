"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const vendor_entity_1 = require("../common/entities/vendor.entity");
const product_entity_1 = require("../common/entities/product.entity");
const entities_1 = require("../common/entities");
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'marketplace',
    entities: [entities_1.Vendor, entities_1.Product],
    synchronize: true,
});
async function seed() {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Database connected');
    const vendorRepo = AppDataSource.getRepository(vendor_entity_1.Vendor);
    const productRepo = AppDataSource.getRepository(product_entity_1.Product);
    const vendors = [
        { name: 'TechGadgets Inc', id: '11111111-1111-1111-1111-111111111111' },
        { name: 'Home Essentials', id: '22222222-2222-2222-2222-222222222222' },
        { name: 'Fashion Forward', id: '33333333-3333-3333-3333-333333333333' },
    ];
    console.log('Creating vendors...');
    for (const vendorData of vendors) {
        const existing = await vendorRepo.findOne({ where: { id: vendorData.id } });
        if (!existing) {
            const vendor = vendorRepo.create(vendorData);
            await vendorRepo.save(vendor);
            console.log(Created, vendor);
        }
        else {
            console.log(vendor_entity_1.Vendor, already, exists);
        }
    }
    const products = [
        {
            id: 'aaaa1111-1111-1111-1111-111111111111',
            vendorId: '11111111-1111-1111-1111-111111111111',
            name: 'Wireless Bluetooth Headphones',
            price: 79.99,
            stockCount: 100,
        },
        {
            id: 'aaaa2222-2222-2222-2222-222222222222',
            vendorId: '11111111-1111-1111-1111-111111111111',
            name: 'USB-C Fast Charger 65W',
            price: 34.99,
            stockCount: 250,
        },
        {
            id: 'aaaa3333-3333-3333-3333-333333333333',
            vendorId: '11111111-1111-1111-1111-111111111111',
            name: 'Mechanical Gaming Keyboard',
            price: 129.99,
            stockCount: 50,
        },
        {
            id: 'bbbb1111-1111-1111-1111-111111111111',
            vendorId: '22222222-2222-2222-2222-222222222222',
            name: 'Stainless Steel Water Bottle',
            price: 24.99,
            stockCount: 500,
        },
        {
            id: 'bbbb2222-2222-2222-2222-222222222222',
            vendorId: '22222222-2222-2222-2222-222222222222',
            name: 'LED Desk Lamp',
            price: 45.99,
            stockCount: 150,
        },
        {
            id: 'cccc1111-1111-1111-1111-111111111111',
            vendorId: '33333333-3333-3333-3333-333333333333',
            name: 'Premium Cotton T-Shirt',
            price: 29.99,
            stockCount: 300,
        },
        {
            id: 'cccc2222-2222-2222-2222-222222222222',
            vendorId: '33333333-3333-3333-3333-333333333333',
            name: 'Slim Fit Jeans',
            price: 59.99,
            stockCount: 75,
        },
    ];
    console.log('\nCreating products...');
    for (const productData of products) {
        const existing = await productRepo.findOne({ where: { id: productData.id } });
        if (!existing) {
            const product = productRepo.create(productData);
            await productRepo.save(product);
            console.log(Created, product);
        }
        else {
            console.log(product_entity_1.Product, already, exists);
        }
    }
    console.log('\nSeed completed!');
    await AppDataSource.destroy();
}
seed().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map