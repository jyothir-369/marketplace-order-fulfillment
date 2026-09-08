import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderStatus } from '../../src/common/entities/order.entity';
import { Vendor } from '../../src/common/entities/vendor.entity';
import { Product } from '../../src/common/entities/product.entity';
import { Order } from '../../src/common/entities/order.entity';
import { OrderLineItem } from '../../src/common/entities/order-line-item.entity';
import { VendorSyncJob } from '../../src/common/entities/vendor-sync-job.entity';
import { AuditLog } from '../../src/common/audit/audit-log.entity';
import { DataSource } from 'typeorm';

describe('Cart + Checkout Sync E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Vendor, Order, Product, OrderLineItem, VendorSyncJob, AuditLog],
          synchronize: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seedProduct(id: string, name: string, stock: number): Promise<void> {
    await dataSource.query(
      `INSERT OR IGNORE INTO vendors (id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      ['11111111-1111-1111-1111-111111111111', 'Acme'],
    );
    await dataSource.query(
      `INSERT INTO products (id, vendor_id, name, price, stock_count, is_active, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, '11111111-1111-1111-1111-111111111111', name, 10, stock],
    );
  }

  it('PUT cart rejects oversell with 409 conflictingProductIds', async () => {
    await seedProduct('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Widget', 2);
    const buyer = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    const res = await request(app.getHttpServer())
      .put('/cart/' + buyer)
      .send({
        buyerId: buyer,
        items: [
          {
            productId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            name: 'Widget',
            vendorId: '11111111-1111-1111-1111-111111111111',
            vendorName: 'Acme',
            quantity: 5,
            unitPrice: 10,
            maxStock: 100,
          },
        ],
      })
      .expect(409);

    expect(res.body.conflictingProductIds).toContain(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    );
  });

  it('cart PUT + GET round-trip returns itemCount and subtotal', async () => {
    await seedProduct('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Gadget', 50);
    const buyer = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

    const put = await request(app.getHttpServer())
      .put('/cart/' + buyer)
      .send({
        buyerId: buyer,
        items: [
          {
            productId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            name: 'Gadget',
            vendorId: '11111111-1111-1111-1111-111111111111',
            vendorName: 'Acme',
            quantity: 2,
            unitPrice: 12,
            maxStock: 100,
          },
        ],
      })
      .expect(200);

    expect(put.body.itemCount).toBe(2);
    expect(put.body.subtotal).toBe(24);
    expect(put.body.items[0].unitPrice).toBe(10); // server-enriched price

    const get = await request(app.getHttpServer())
      .get('/cart/' + buyer)
      .expect(200);
    expect(get.body.itemCount).toBe(2);
  });

  it('checkout with idempotencyKey does not duplicate orders', async () => {
    await seedProduct('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Durable', 20);
    const buyer = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const payload = {
      buyerId: buyer,
      items: [{ productId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', quantity: 1 }],
      shippingAddress: '123 Test St',
      idempotencyKey: 'e2e-idem-1',
    };

    const first = await request(app.getHttpServer())
      .post('/orders/checkout')
      .send(payload)
      .expect(201);
    expect(first.body.success).toBe(true);

    const second = await request(app.getHttpServer())
      .post('/orders/checkout')
      .send(payload)
      .expect(201);
    expect(second.body.order.id).toBe(first.body.order.id);
    expect(second.body.message).toBe('Order already placed');
  });

  it('inventory guard throws 409 during checkout on oversell', async () => {
    await seedProduct('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Widget', 2);
    const buyer = '99999999-9999-9999-9999-999999999999';

    const res = await request(app.getHttpServer())
      .post('/orders/checkout')
      .send({
        buyerId: buyer,
        items: [{ productId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', quantity: 99 }],
        shippingAddress: '123 Test St',
      })
      .expect(409);

    expect(res.body.conflictingProductIds).toContain(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    );
  });
});
