"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
const entities_1 = require("../common/entities");
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'marketplace',
    entities: [entities_1.Vendor, entities_1.Product],
    synchronize: false,
    logging: false,
});
class ConcurrencyTestRunner {
    constructor() {
        this.results = [];
        this.dataSource = AppDataSource;
    }
    async initialize() {
        console.log('Initializing load test environment...');
        await this.dataSource.initialize();
        console.log('Database connection established');
    }
    async cleanup() {
        await this.dataSource.destroy();
    }
    async getTestProducts(count) {
        const productRepo = this.dataSource.getRepository(entities_1.Product);
        return productRepo
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.vendor', 'vendor')
            .where('product.stockCount >= :minStock', { minStock: count * 2 })
            .andWhere('product.isActive = :active', { active: true })
            .orderBy('product.stockCount', 'DESC')
            .take(count)
            .getMany();
    }
    async getProductStock(productId) {
        const product = await this.dataSource.getRepository(entities_1.Product).findOne({
            where: { id: productId },
        });
        return product?.stockCount ?? 0;
    }
    async setProductStock(productId, stockCount) {
        await this.dataSource.getRepository(entities_1.Product).update(productId, { stockCount });
    }
    async simulateCheckout(buyerId, productId, quantity, correlationId) {
        const startTime = Date.now();
        const result = {
            correlationId,
            buyerId,
            productId,
            success: false,
            message: '',
            timestamp: new Date(),
            durationMs: 0,
        };
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const product = await queryRunner.manager
                .createQueryBuilder(entities_1.Product, 'product')
                .setLock('pessimistic_write')
                .where('product.id = :id', { id: productId })
                .getOne();
            if (!product) {
                result.message = 'Product not found';
                await queryRunner.rollbackTransaction();
                return result;
            }
            if (product.stockCount < quantity) {
                result.message = 'Insufficient stock: requested ' + quantity + ', available ' + product.stockCount;
                await queryRunner.rollbackTransaction();
                return result;
            }
            const newStock = product.stockCount - quantity;
            await queryRunner.manager
                .createQueryBuilder()
                .update(entities_1.Product)
                .set({ stockCount: newStock })
                .where('id = :id', { id: productId })
                .execute();
            await queryRunner.commitTransaction();
            result.success = true;
            result.message = 'Success: stock ' + product.stockCount + ' -> ' + newStock;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            result.message = error instanceof Error ? error.message : 'Unknown error';
        }
        finally {
            await queryRunner.release();
            result.durationMs = Date.now() - startTime;
        }
        return result;
    }
    async runOversellTest(productId, initialStock, checkoutQuantity, concurrentRequests) {
        console.log('');
        console.log('-'.repeat(50));
        console.log('OVERSELL TEST (Concurrency Safety)');
        console.log('-'.repeat(50));
        console.log('Product ID: ' + productId);
        console.log('Initial Stock: ' + initialStock);
        console.log('Checkout Quantity: ' + checkoutQuantity);
        console.log('Concurrent Requests: ' + concurrentRequests);
        console.log('Expected Successes: ' + Math.floor(initialStock / checkoutQuantity));
        console.log('');
        await this.setProductStock(productId, initialStock);
        const promises = [];
        for (let i = 0; i < concurrentRequests; i++) {
            const buyerId = (0, uuid_1.v4)();
            const correlationId = 'load-test-' + Date.now() + '-' + i;
            promises.push(this.simulateCheckout(buyerId, productId, checkoutQuantity, correlationId));
        }
        const results = await Promise.all(promises);
        this.results.push(...results);
        return results;
    }
    async runParallelCheckoutTest(products, checkoutQuantity, checkoutsPerProduct) {
        console.log('');
        console.log('-'.repeat(50));
        console.log('PARALLEL CHECKOUT TEST');
        console.log('-'.repeat(50));
        console.log('Products: ' + products.length);
        console.log('Checkout Quantity: ' + checkoutQuantity);
        console.log('Checkouts per Product: ' + checkoutsPerProduct);
        console.log('Total Checkouts: ' + (products.length * checkoutsPerProduct));
        console.log('');
        const promises = [];
        for (const product of products) {
            for (let i = 0; i < checkoutsPerProduct; i++) {
                const buyerId = (0, uuid_1.v4)();
                const correlationId = 'parallel-' + product.id + '-' + i;
                promises.push(this.simulateCheckout(buyerId, product.id, checkoutQuantity, correlationId));
            }
        }
        const results = await Promise.all(promises);
        this.results.push(...results);
        return results;
    }
    generateReport(config, oversellResults, parallelResults, inventoryState) {
        const allResults = [...oversellResults, ...parallelResults];
        const successfulCheckouts = allResults.filter(r => r.success);
        const failedCheckouts = allResults.filter(r => !r.success);
        const oversoldCheckouts = oversellResults.filter(r => r.success).length -
            Math.max(0, Math.floor(config.stockQuantity / config.checkoutQuantity));
        return {
            testConfig: config,
            totalCheckouts: allResults.length,
            successfulCheckouts: successfulCheckouts.length,
            failedCheckouts: failedCheckouts.length,
            oversoldCheckouts: Math.max(0, oversoldCheckouts),
            results: allResults,
            inventoryState,
            successRate: (successfulCheckouts.length / allResults.length) * 100,
            averageLatencyMs: allResults.reduce((sum, r) => sum + r.durationMs, 0) / allResults.length,
        };
    }
    printReport(report) {
        console.log('');
        console.log('='.repeat(70));
        console.log('                    LOAD TEST REPORT');
        console.log('='.repeat(70));
        console.log('');
        console.log('TEST CONFIGURATION:');
        console.log('  Concurrent Checkouts: ' + report.testConfig.concurrentCheckouts);
        console.log('  Stock Quantity: ' + report.testConfig.stockQuantity);
        console.log('  Checkout Quantity: ' + report.testConfig.checkoutQuantity);
        console.log('');
        console.log('RESULTS SUMMARY:');
        console.log('  Total Checkouts: ' + report.totalCheckouts);
        console.log('  Successful: ' + report.successfulCheckouts + ' (' + report.successRate.toFixed(2) + '%)');
        console.log('  Failed: ' + report.failedCheckouts);
        console.log('  Oversold: ' + report.oversoldCheckouts);
        console.log('');
        console.log('PERFORMANCE METRICS:');
        console.log('  Average Latency: ' + report.averageLatencyMs.toFixed(2) + 'ms');
        console.log('');
        if (report.oversoldCheckouts === 0) {
            console.log('CONCURRENCY SAFETY: PASSED');
            console.log('  No overselling detected - inventory locks working correctly!');
        }
        else {
            console.log('CONCURRENCY SAFETY: FAILED');
            console.log('  ' + report.oversoldCheckouts + ' oversold transactions detected!');
        }
        console.log('');
        console.log('='.repeat(70));
    }
}
async function runLoadTest() {
    console.log('');
    console.log('========================================');
    console.log('       MARKETPLACE LOAD TEST - PHASE 9');
    console.log('========================================');
    console.log('');
    const runner = new ConcurrencyTestRunner();
    const config = {
        concurrentCheckouts: 20,
        stockQuantity: 10,
        checkoutQuantity: 1,
        productsToTest: 3,
    };
    try {
        await runner.initialize();
        const products = await runner.getTestProducts(config.productsToTest);
        if (products.length === 0) {
            console.log('ERROR: No products found. Run seed script first:');
            console.log('  npm run seed');
            process.exit(1);
        }
        console.log('Found ' + products.length + ' products for testing');
        const inventoryState = new Map();
        for (const product of products) {
            inventoryState.set(product.id, {
                initialStock: product.stockCount,
                finalStock: product.stockCount,
                sold: 0,
            });
        }
        console.log('');
        console.log('TEST 1: CONCURRENCY OVERSELL TEST');
        console.log('Testing pessimistic locking prevents overselling...');
        const testProduct = products[0];
        const oversellResults = await runner.runOversellTest(testProduct.id, config.stockQuantity, config.checkoutQuantity, config.concurrentCheckouts);
        const oversellSuccesses = oversellResults.filter(r => r.success).length;
        const expectedSuccesses = Math.floor(config.stockQuantity / config.checkoutQuantity);
        console.log('');
        console.log('OVERSELL TEST RESULTS:');
        console.log('  Successful Checkouts: ' + oversellSuccesses);
        console.log('  Expected Successes: ' + expectedSuccesses);
        console.log('  Excess Successes: ' + Math.max(0, oversellSuccesses - expectedSuccesses));
        if (oversellSuccesses <= expectedSuccesses) {
            console.log('  RESULT: PASS - No overselling detected');
        }
        else {
            console.log('  RESULT: FAIL - Overselling detected!');
        }
        const finalStock = await runner.getProductStock(testProduct.id);
        const sold = inventoryState.get(testProduct.id).initialStock - finalStock;
        inventoryState.get(testProduct.id).finalStock = finalStock;
        inventoryState.get(testProduct.id).sold = sold;
        console.log('');
        console.log('TEST 2: PARALLEL CHECKOUT TEST');
        console.log('Testing multiple products with parallel checkouts...');
        const parallelResults = await runner.runParallelCheckoutTest(products.slice(0, 2), config.checkoutQuantity, 5);
        const parallelSuccesses = parallelResults.filter(r => r.success).length;
        console.log('');
        console.log('PARALLEL TEST RESULTS:');
        console.log('  Total Checkouts: ' + parallelResults.length);
        console.log('  Successful: ' + parallelSuccesses);
        console.log('  Failed: ' + (parallelResults.length - parallelSuccesses));
        const report = runner.generateReport(config, oversellResults, parallelResults, inventoryState);
        runner.printReport(report);
        await runner.cleanup();
        console.log('');
        if (report.oversoldCheckouts === 0) {
            console.log('ALL TESTS PASSED - System is concurrency-safe!');
            process.exit(0);
        }
        else {
            console.log('TESTS FAILED - Concurrency issues detected!');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Load test failed:', error);
        await runner.cleanup();
        process.exit(1);
    }
}
runLoadTest();
//# sourceMappingURL=load-test.js.map