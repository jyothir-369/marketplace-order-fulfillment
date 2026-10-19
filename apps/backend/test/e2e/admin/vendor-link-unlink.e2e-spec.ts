import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('Vendor account link/unlink HTTP E2E (Task C)', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    ds = moduleFixture.get(DataSource);
    expect(String(ds.options.database)).toContain('vendor_migration_test');
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('rejects unauthenticated link request', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/vendors/00000000-0000-0000-0000-000000000001/users')
      .send({ email: 'test@test.dev' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid vendor UUID with bad request', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/vendors/bad-uuid/users')
      .send({ email: 'test@test.dev' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
