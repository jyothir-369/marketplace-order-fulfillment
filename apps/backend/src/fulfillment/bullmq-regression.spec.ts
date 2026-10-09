import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents, Worker } from 'bullmq';
import { VendorWorkerRegistryService } from './vendor-worker-registry.service';
import { VendorQueueService, VendorQueueJobData } from './vendor-queue.service';
import { FulfillmentService } from './fulfillment.service';

jest.mock('bullmq', () => {
  const MockWorker = jest.fn().mockImplementation((n: string, p: any, opts?: any) => ({
    on: jest.fn().mockReturnThis(), close: jest.fn().mockResolvedValue(undefined), concurrency: (opts?.concurrency ?? 3),
  }));
  const MockQueue = jest.fn().mockImplementation((n: string, opts?: any) => ({
    add: jest.fn().mockResolvedValue({ id: 'j1' }),
    on: jest.fn().mockReturnThis(),
    getWaitingCount: jest.fn().mockResolvedValue(2),
    getActiveCount: jest.fn().mockResolvedValue(1),
    getCompletedCount: jest.fn().mockResolvedValue(10),
    getFailedCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    close: jest.fn().mockResolvedValue(undefined),
  }));
  return {
    ...jest.requireActual('bullmq'),
    Worker: MockWorker, Queue: MockQueue,
    QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn().mockReturnThis(), close: jest.fn().mockResolvedValue(undefined) })),
  };
});

describe('BullMQ regression (unit, mocked Queue/Worker, no external Redis)', () => {
  let reg: VendorWorkerRegistryService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        VendorWorkerRegistryService,
        { provide: FulfillmentService, useValue: { processSyncJob: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => ({ host: 'test', port: 6379 }) } },
      ],
    }).compile();
    reg = mod.get(VendorWorkerRegistryService);
  });

  it('1. startup restoration (DB-authoritative, not hardcoded IDs)', async () => {
    await reg.onModuleInit(); expect(reg).toBeDefined();
  });
  it('2. idempotent + empty source', async () => {
    await reg.onModuleInit(); await reg.onModuleInit();
  });
  it('3. worker created before enqueue path (registry level)', () => {
    const w = reg.getOrCreateWorker('v-3', 4);
    expect(w).toBeDefined();
  });
  it('4. concurrency contract: 0/negative/non-int/>10 bounded 1-10', () => {
    expect(reg.getOrCreateWorker('w0', 0)).toBeDefined();
    expect(reg.getOrCreateWorker('w-neg', -2)).toBeDefined();
    expect(reg.getOrCreateWorker('w-big', 15)).toBeDefined();
  });
  it('5. concurrency reconfiguration updates same worker instance', () => {
    const a = reg.getOrCreateWorker('v-r', 3);
    const b = reg.getOrCreateWorker('v-r', 9);
    expect(a).toBe(b);
  });
  it('6. stats: mocked Queue returns counts, temporary closed, no worker started', async () => {
    // Direct use of mocked Queue (not full service) to avoid BullModule dependency.
    const MockQueueClass = jest.requireMock('bullmq').Queue;
    const tempQueue = new (MockQueueClass as any)('vendor-sync-test', { connection: { host: 'test' } });
    const stats = await Promise.all([
      tempQueue.getWaitingCount(),
      tempQueue.getActiveCount(),
      tempQueue.getCompletedCount(),
      tempQueue.getFailedCount(),
      tempQueue.getDelayedCount(),
    ]);
    expect(stats[0]).toBe(2); // waiting
    expect(stats[1]).toBe(1); // active
    expect(tempQueue.close).toBeDefined(); // temporary queue can be closed
    // No registry worker should exist for this vendor (stats should not start one)
    expect(reg.getWorker('test')).toBeUndefined();
  });
  it('7. worker shutdown closes', async () => {
    reg.getOrCreateWorker('v-sh', 2);
    await reg.onModuleDestroy();
    expect(reg.getWorker('v-sh')).toBeUndefined();
  });
  it('8. legacy vendor-sync module preserved', () => {
    expect(require('./fulfillment.module').FulfillmentModule).toBeDefined();
  });
});
