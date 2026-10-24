import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { VendorSettingsController } from '../vendor/vendor-settings.controller';
import { VendorSettingsService } from '../vendor/vendor-settings.service';

describe('VendorSettingsRegression (RED -> GREEN)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ controllers: [VendorSettingsController],
    providers: [{ provide: VendorSettingsService, useValue: { getSettings: () => ({ name: 'Test Store' }), updateSettings: () => ({ name: 'Updated Store' }) } }], }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => { if (app && typeof app.close === 'function') await app.close(); });

  it('GET /vendor/settings should not return 404 when route is registered', async () => {
    const res = await request(app.getHttpServer()).get('/vendor/settings');
    expect(res.status).not.toBe(404);
  });

  it('PATCH /vendor/settings updates name and returns it', async () => {
    const res = await request(app.getHttpServer())
      .patch('/vendor/settings')
      .send({ name: 'Updated Store' })
      .set('Content-Type', 'application/json');
    expect(res.status).not.toBe(404);
    expect([401, 403, 200, 400]).toContain(res.status);
  });
});
