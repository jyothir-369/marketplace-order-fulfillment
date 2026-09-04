import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
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

describe('Order Lifecycle E2E', () => {
  let app: INestApplication;

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
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should complete the full order lifecycle flow', async () => {
    // 1. Checkout (Place Order)
    const checkoutDto = {
      buyerId: 'b1',
      items: [{ productId: 'p1', quantity: 1 }],
      shippingAddress: '123 Test St',
    };

    const checkoutResponse = await request(app.getHttpServer())
      .post('/orders')
      .send(checkoutDto)
      .expect(201);

    const orderId = checkoutResponse.body.order.id;
    expect(orderId).toBeDefined();

    // 2. Verify Order State (e.g., PLACED or FULFILLING)
    const getOrderResponse = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .expect(200);

    expect(getOrderResponse.body.order.status).toBe(OrderStatus.PLACED);
  });
});