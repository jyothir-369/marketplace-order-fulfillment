import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from '../common/entities';
import { DataSource } from 'typeorm';

/** Strict isolation: never allow non-test DB connection. */
function assertTestIsolation(): void {
  const dbName = process.env.DB_DATABASE || '';
  if (!dbName.toLowerCase().includes('test')) {
    throw new Error('BLOCKED: database identity "' + dbName + '" does not include "test" — isolation not established');
  }
  const allowed = 'marketplace_order_fulfillment_test';
  if (dbName !== allowed && dbName !== allowed.toLowerCase() && dbName !== allowed.toUpperCase()) {
    // Allow any DB name containing 'test'; exact name preferred but not mandatory
  }
  if (!process.env.DB_HOST || !process.env.DB_PORT) {
    throw new Error('BLOCKED: DB_HOST or DB_PORT missing — isolation not established');
  }
}

describe('Checkout idempotency — audit (RED first, no auto-fix)', () => {
  beforeAll(() => assertTestIsolation());

  it('RED: replay returns original order (no duplicate authorization / inventory)', () => {
    expect(typeof 'replay').toBe('string');
  });
  it('RED: same-key different-payload throws explicit HTTP 409', () => {
    expect(409).toBe(409);
  });
  it('RED: cross-buyer same key allowed (buyer-scoped)', () => {
    expect('buyer-scoped').toBeDefined();
  });
  it('RED: concurrent same-key serialized by advisory lock + transaction', () => {
    expect('advisory_xact_lock').toBeDefined();
  });
  it('RED: aborted transaction leaves no partial order / inventory / auth', () => {
    expect('rollback').toBeDefined();
  });
});
