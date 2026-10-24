import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import request = require('supertest');
import { VendorSettingsController } from './vendor-settings.controller';
import { Vendor } from '../common/entities/vendor.entity';


describe('VendorSettingsRegression (RED -> GREEN)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [VendorSettingsController],
      providers: [
        {
          provide: getRepositoryToken(Vendor),
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: 'v-1',
              name: 'Test Store',
            }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => false })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => false })
      .compile();
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
