"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const entities_1 = require("../common/entities");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
async function runLoadTest() {
    console.log('Starting concurrency load test...\n');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error'],
    });
    const dataSource = app.get(typeorm_1.DataSource);
    await dataSource.initialize();
    const vendorRepo = dataSource.getRepository(entities_1.Vendor);
    const productRepo = dataSource.getRepository(entities_1.Product);
    const vendor = await vendorRepo.save({
        name: 'Load Test Vendor',
    });
    const initialStock = 10;
    const product = await productRepo.save({
        vendorId: vendor.id,
        name: 'Limited Stock Product',
        price: 19.99,
        stockCount: initialStock,
        isActive: true,
    });
    console.log(Initial, stock);
    console.log(Concurrent, requests, 50, n);
    const concurrency = 50;
    const results = [];
    const checkoutPromises = Array.from({ length: concurrency }, async (_, i) => {
        try {
            await dataSource.transaction(async (manager) => {
                const lockedProduct = await manager
                    .createQueryBuilder(entities_1.Product, 'product')
                    .setLock('pessimistic_write')
                    .where('product.id = :id', { id: product.id })
                    .getOne();
                if (!lockedProduct || lockedProduct.stockCount < 1) {
                    throw new Error('Insufficient stock');
                }
                await manager
                    .createQueryBuilder()
                    .update(entities_1.Product)
                    .set({ stockCount: lockedProduct.stockCount - 1 })
                    .where('id = :id', { id: product.id })
                    .execute();
            });
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    const settledResults = await Promise.all(checkoutPromises);
    results.push(...settledResults);
    const successfulOrders = results.filter((r) => r.success).length;
    const failedOrders = results.filter((r) => !r.success).length;
    const finalProduct = await productRepo.findOne({ where: { id: product.id } });
    const finalStock = finalProduct?.stockCount || 0;
    const expectedFinalStock = initialStock - successfulOrders;
    const oversold = finalStock < 0 || (initialStock - successfulOrders) < 0;
    const result = {
        totalRequests: concurrency,
        successfulOrders,
        failedOrders,
        oversold: finalStock < 0,
        finalStock,
        errors: results.filter((r) => !r.success).map((r) => r.error || 'Unknown'),
    };
    console.log('=== LOAD TEST RESULTS ===\n');
    console.log(Total, requests);
    console.log(Successful, orders);
    console.log(Failed, orders);
    console.log(Initial, stock);
    console.log(Final, stock);
    console.log(Expected, final);
    console.log(Oversold);
    if (result.oversold) {
        console.error('\n!!! OVERSELLING DETECTED !!!');
        console.error('This indicates a critical concurrency bug.');
        process.exit(1);
    }
    if (result.finalStock !== expectedFinalStock) {
        console.error('\n!!! STOCK MISMATCH !!!');
        console.error(Expected, got);
        process.exit(1);
    }
    console.log('\n✓ Load test PASSED: No overselling detected');
    await dataSource.getRepository(entities_1.OrderLineItem).delete({ productId: product.id });
    await dataSource.getRepository(entities_1.Order).delete({});
    await dataSource.getRepository(entities_1.Product).delete({ id: product.id });
    await dataSource.getRepository(entities_1.Vendor).delete({ id: vendor.id });
    await dataSource.destroy();
    await app.close();
}
runLoadTest().catch((error) => {
    console.error('Load test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=load-test.js.map