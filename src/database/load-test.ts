import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Vendor, Product } from '../common/entities';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'marketplace',
  entities: [Vendor, Product],
  synchronize: false,
  logging: false,
});

interface LoadTestConfig {
  concurrentCheckouts: number;
  stockQuantity: number;
  checkoutQuantity: number;
  productsToTest: number;
}

interface CheckoutResult {
  correlationId: string;
  buyerId: string;
  productId: string;
  success: boolean;
  message: string;
  timestamp: Date;
  durationMs: number;
}

interface LoadTestReport {
  testConfig: LoadTestConfig;
  totalCheckouts: number;
  successfulCheckouts: number;
  failedCheckouts: number;
  oversoldCheckouts: number;
  results: CheckoutResult[];
  inventoryState: Map<string, { initialStock: number; finalStock: number; sold: number }>;
  successRate: number;
  averageLatencyMs: number;
}

class ConcurrencyTestRunner {
  private dataSource: DataSource;
  private results: CheckoutResult[] = [];

  constructor() {
    this.dataSource = AppDataSource;
  }

  async initialize(): Promise<void> {
    console.log('Initializing load test environment...');
    await this.dataSource.initialize();
    console.log('Database connection established');
  }

  async cleanup(): Promise<void> {
    await this.dataSource.destroy();
  }

  async getTestProducts(count: number): Promise<Product[]> {
    const productRepo = this.dataSource.getRepository(Product);
    return productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .where('product.stockCount >= :minStock', { minStock: count * 2 })
      .andWhere('product.isActive = :active', { active: true })
      .orderBy('product.stockCount', 'DESC')
      .take(count)
      .getMany();
  }

  async getProductStock(productId: string): Promise<number> {
    const product = await this.dataSource.getRepository(Product).findOne({
      where: { id: productId },
    });
    return product?.stockCount ?? 0;
  }

  async setProductStock(productId: string, stockCount: number): Promise<void> {
    await this.dataSource.getRepository(Product).update(productId, { stockCount });
  }

  async simulateCheckout(
    buyerId: string,
    productId: string,
    quantity: number,
    correlationId: string,
  ): Promise<CheckoutResult> {
    const startTime = Date.now();
    const result: CheckoutResult = {
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
        .createQueryBuilder(Product, 'product')
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
        .update(Product)
        .set({ stockCount: newStock })
        .where('id = :id', { id: productId })
        .execute();

      await queryRunner.commitTransaction();
      result.success = true;
      result.message = 'Success: stock ' + product.stockCount + ' -> ' + newStock;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      result.message = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      await queryRunner.release();
      result.durationMs = Date.now() - startTime;
    }

    return result;
  }

  async runOversellTest(
    productId: string,
    initialStock: number,
    checkoutQuantity: number,
    concurrentRequests: number,
  ): Promise<CheckoutResult[]> {
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

    const promises: Promise<CheckoutResult>[] = [];
    for (let i = 0; i < concurrentRequests; i++) {
      const buyerId = uuidv4();
      const correlationId = 'load-test-' + Date.now() + '-' + i;
      promises.push(
        this.simulateCheckout(buyerId, productId, checkoutQuantity, correlationId)
      );
    }

    const results = await Promise.all(promises);
    this.results.push(...results);
    return results;
  }

  async runParallelCheckoutTest(
    products: Product[],
    checkoutQuantity: number,
    checkoutsPerProduct: number,
  ): Promise<CheckoutResult[]> {
    console.log('');
    console.log('-'.repeat(50));
    console.log('PARALLEL CHECKOUT TEST');
    console.log('-'.repeat(50));
    console.log('Products: ' + products.length);
    console.log('Checkout Quantity: ' + checkoutQuantity);
    console.log('Checkouts per Product: ' + checkoutsPerProduct);
    console.log('Total Checkouts: ' + (products.length * checkoutsPerProduct));
    console.log('');

    const promises: Promise<CheckoutResult>[] = [];

    for (const product of products) {
      for (let i = 0; i < checkoutsPerProduct; i++) {
        const buyerId = uuidv4();
        const correlationId = 'parallel-' + product.id + '-' + i;
        promises.push(
          this.simulateCheckout(buyerId, product.id, checkoutQuantity, correlationId)
        );
      }
    }

    const results = await Promise.all(promises);
    this.results.push(...results);
    return results;
  }

  generateReport(
    config: LoadTestConfig,
    oversellResults: CheckoutResult[],
    parallelResults: CheckoutResult[],
    inventoryState: Map<string, { initialStock: number; finalStock: number; sold: number }>,
  ): LoadTestReport {
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

  printReport(report: LoadTestReport): void {
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
    } else {
      console.log('CONCURRENCY SAFETY: FAILED');
      console.log('  ' + report.oversoldCheckouts + ' oversold transactions detected!');
    }
    console.log('');

    console.log('='.repeat(70));
  }
}

async function runLoadTest(): Promise<void> {
  console.log('');
  console.log('========================================');
  console.log('       MARKETPLACE LOAD TEST - PHASE 9');
  console.log('========================================');
  console.log('');

  const runner = new ConcurrencyTestRunner();
  const config: LoadTestConfig = {
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

    const inventoryState = new Map<string, { initialStock: number; finalStock: number; sold: number }>();
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
    const oversellResults = await runner.runOversellTest(
      testProduct.id,
      config.stockQuantity,
      config.checkoutQuantity,
      config.concurrentCheckouts,
    );

    const oversellSuccesses = oversellResults.filter(r => r.success).length;
    const expectedSuccesses = Math.floor(config.stockQuantity / config.checkoutQuantity);

    console.log('');
    console.log('OVERSELL TEST RESULTS:');
    console.log('  Successful Checkouts: ' + oversellSuccesses);
    console.log('  Expected Successes: ' + expectedSuccesses);
    console.log('  Excess Successes: ' + Math.max(0, oversellSuccesses - expectedSuccesses));

    if (oversellSuccesses <= expectedSuccesses) {
      console.log('  RESULT: PASS - No overselling detected');
    } else {
      console.log('  RESULT: FAIL - Overselling detected!');
    }

    const finalStock = await runner.getProductStock(testProduct.id);
    const sold = inventoryState.get(testProduct.id)!.initialStock - finalStock;
    inventoryState.get(testProduct.id)!.finalStock = finalStock;
    inventoryState.get(testProduct.id)!.sold = sold;

    console.log('');
    console.log('TEST 2: PARALLEL CHECKOUT TEST');
    console.log('Testing multiple products with parallel checkouts...');

    const parallelResults = await runner.runParallelCheckoutTest(
      products.slice(0, 2),
      config.checkoutQuantity,
      5,
    );

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
    } else {
      console.log('TESTS FAILED - Concurrency issues detected!');
      process.exit(1);
    }

  } catch (error) {
    console.error('Load test failed:', error);
    await runner.cleanup();
    process.exit(1);
  }
}

runLoadTest();