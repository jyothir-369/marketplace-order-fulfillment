import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentAuthorization, PaymentStatus } from '../common/entities/payment-authorization.entity';
import { MockPaymentService } from './mock-payment.service';
import { AuditService } from '../common/audit';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: any;
  let mockPaymentService: any;
  let auditService: any;
  let manager: any;

  const paymentRepo = () => {
    let refunded = false;
    return {
      findOne: jest.fn(),
      update: jest.fn((_id, patch) => { refunded = patch.status === PaymentStatus.REFUNDED; return Promise.resolve({}); }),
      find: jest.fn(),
      isRefunded: () => refunded,
    };
  };

  beforeEach(async () => {
    paymentRepository = paymentRepo();
    mockPaymentService = {
      authorize: jest.fn().mockResolvedValue({ success: true, status: PaymentStatus.AUTHORIZED, providerReference: 'PAY-ABC12345', message: 'Authorization approved' }),
    };
    auditService = {
      logPaymentAuthorized: jest.fn().mockResolvedValue(undefined),
      logPaymentRefunded: jest.fn().mockResolvedValue(undefined),
      logPaymentFailed: jest.fn(),
    };

    // A fake EntityManager whose payment repo records captures.
    const captured: any[] = [];
    manager = {
      getRepository: jest.fn(() => ({
        create: jest.fn((data) => ({ ...data, id: 'pay1' })),
        save: jest.fn((row) => { captured.push(row); return Promise.resolve(row); }),
        findOne: jest.fn((opts) => Promise.resolve(null)),
        update: jest.fn(() => Promise.resolve({})),
      })),
      getCaptured: () => captured,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(PaymentAuthorization), useValue: paymentRepository },
        { provide: MockPaymentService, useValue: mockPaymentService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authorize', () => {
    it('delegates to the mock provider (no token)', async () => {
      const result = await service.authorize(50, 'corr1');
      expect(mockPaymentService.authorize).toHaveBeenCalledWith(50, 'corr1', undefined);
      expect(result.success).toBe(true);
    });

    it('passes the card token through', async () => {
      await service.authorize(50, 'corr1', 'mock-decline');
      expect(mockPaymentService.authorize).toHaveBeenCalledWith(50, 'corr1', 'mock-decline');
    });
  });

  describe('recordCapture', () => {
    it('persists a captured row against the order and audits it', async () => {
      const authorization = { success: true, status: PaymentStatus.AUTHORIZED, providerReference: 'PAY-ABC12345', message: 'ok' };
      const payment = await service.recordCapture(manager, 'order1', 20, authorization, 'corr1');

      expect(payment.id).toBe('pay1');
      expect(payment.orderId).toBe('order1');
      expect(payment.status).toBe(PaymentStatus.CAPTURED);
      expect(payment.provider).toBe('mock');
      expect(manager.getCaptured()).toHaveLength(1);
      expect(manager.getCaptured()[0].providerReference).toBe('PAY-ABC12345');

      expect(auditService.logPaymentAuthorized).toHaveBeenCalledWith('corr1', 'pay1', 'order1', 20, 'PAY-ABC12345');
    });
  });

  describe('refund', () => {
    it('is a no-op when the order has no authorization', async () => {
      paymentRepository.findOne.mockResolvedValueOnce(null);
      const result = await service.refund('order-missing', 'corr1');
      expect(result).toBeNull();
      expect(paymentRepository.update).not.toHaveBeenCalled();
      expect(auditService.logPaymentRefunded).not.toHaveBeenCalled();
    });

    it('is idempotent when already refunded', async () => {
      const existing = { id: 'pay1', orderId: 'order1', amount: '20.00', status: PaymentStatus.REFUNDED };
      paymentRepository.findOne.mockResolvedValueOnce(existing);
      const result = await service.refund('order1', 'corr1');
      expect(result).toEqual(existing);
      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('marks a captured authorization refunded and audits it', async () => {
      const raw = { id: 'pay1', orderId: 'order1', amount: '35.00', status: PaymentStatus.CAPTURED, providerReference: 'PAY-ABC12345' };
      paymentRepository.findOne.mockResolvedValueOnce(raw);
      const result = await service.refund('order1', 'corr1');

      expect(paymentRepository.update).toHaveBeenCalledWith('pay1', { status: PaymentStatus.REFUNDED, failureReason: 'Refunded on order cancellation' });
      expect(auditService.logPaymentRefunded).toHaveBeenCalledWith('corr1', 'pay1', 'order1', 35);
      expect(result?.status).toBe(PaymentStatus.REFUNDED);
    });

    it('runs against the caller manager when one is supplied (cancel atomicity)', async () => {
      const managerFinder = jest.fn().mockResolvedValueOnce({ id: 'pay1', orderId: 'order1', amount: '10.00', status: PaymentStatus.CAPTURED });
      manager.getRepository = jest.fn(() => ({
        findOne: managerFinder,
        update: jest.fn(() => Promise.resolve({})),
      }));

      await service.refund('order1', 'corr1', manager);
      expect(managerFinder).toHaveBeenCalled();
    });
  });

  describe('findByOrderId', () => {
    it('returns the order payments newest-first', async () => {
      paymentRepository.find.mockResolvedValueOnce([{ id: 'pay2' }, { id: 'pay1' }]);
      const rows = await service.findByOrderId('order1');
      expect(paymentRepository.find).toHaveBeenCalledWith({
        where: { orderId: 'order1' },
        order: { createdAt: 'DESC' },
      });
      expect(rows).toHaveLength(2);
    });
  });
});