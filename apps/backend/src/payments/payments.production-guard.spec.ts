import { ServiceUnavailableException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MockPaymentService } from './mock-payment.service';
import { PaymentStatus } from '../common/entities/payment-authorization.entity';

describe('Payment production safety guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let service: PaymentsService;
  let paymentRepository: any;
  let mockPaymentService: any;
  let auditService: any;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';

    paymentRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
    };
    mockPaymentService = {
      authorize: jest.fn(),
    };
    auditService = {
      logPaymentAuthorized: jest.fn(),
      logPaymentRefunded: jest.fn(),
    };

    service = new PaymentsService(
      paymentRepository,
      mockPaymentService,
      auditService,
    );
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('blocks mock authorization in production', async () => {
    await expect(service.authorize(100, 'corr1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(mockPaymentService.authorize).not.toHaveBeenCalled();
  });

  it('blocks persistence of a simulated capture in production', async () => {
    const manager = { getRepository: jest.fn() };

    await expect(
      service.recordCapture(
        manager as any,
        'order1',
        100,
        {
          success: true,
          status: PaymentStatus.AUTHORIZED,
          providerReference: 'PAY-MOCK',
          message: 'Authorization approved',
        },
        'corr1',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(manager.getRepository).not.toHaveBeenCalled();
  });

  it('allows a no-op when no payment exists in production', async () => {
    paymentRepository.findOne.mockResolvedValue(null);

    await expect(service.refund('order1', 'corr1')).resolves.toBeNull();

    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('blocks simulated refunds in production before database mutation', async () => {
    paymentRepository.findOne.mockResolvedValue({
      id: 'payment1',
      orderId: 'order1',
      amount: '100.00',
      status: PaymentStatus.CAPTURED,
      provider: 'mock',
      providerReference: 'PAY-MOCK',
    });

    await expect(
      service.refund('order1', 'corr1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(paymentRepository.findOne).toHaveBeenCalled();
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('keeps an already-refunded payment idempotent in production', async () => {
    const payment = {
      id: 'payment1',
      orderId: 'order1',
      amount: '100.00',
      status: PaymentStatus.REFUNDED,
      provider: 'mock',
      providerReference: 'PAY-MOCK',
    };
    paymentRepository.findOne.mockResolvedValue(payment);

    await expect(service.refund('order1', 'corr1')).resolves.toEqual(payment);

    expect(paymentRepository.update).not.toHaveBeenCalled();
  });
  it('blocks direct mock-provider authorization in production', async () => {
    const provider = new MockPaymentService();

    await expect(
      provider.authorize(100, 'corr1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});