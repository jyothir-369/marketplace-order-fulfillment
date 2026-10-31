import { PaymentsService } from '../payments.service';
import { PaymentStatus } from '../../common/entities/payment-authorization.entity';

describe('Area 2 — Refund / reversal idempotency (executable)', () => {
  const repo = () => {
    let status = PaymentStatus.CAPTURED;
    return {
      findOne: jest.fn().mockResolvedValue({ id: 'p1', orderId: 'o1', amount: 100, status }),
      update: jest.fn().mockImplementation(async (_id: any, patch: any) => { status = patch.status; return {}; }),
      find: jest.fn().mockResolvedValue([]),
    };
  };

  it('is idempotent when already REFUNDED (duplicate webhook / retry safe)', async () => {
    const r = repo();
    r.findOne.mockResolvedValue({ id: 'p1', orderId: 'o1', amount: 100, status: PaymentStatus.REFUNDED });
    const svc = new PaymentsService(r as any, { authorize: jest.fn() } as any, { logPaymentRefunded: jest.fn() } as any, { refundPayment: jest.fn() } as any);
    const res = await svc.refund('o1', 'c1');
    expect(res?.status).toBe(PaymentStatus.REFUNDED);
    expect(r.update).not.toHaveBeenCalled();
  });

  it('marks CAPTURED -> REFUNDED exactly once (no double-apply)', async () => {
    const r = repo();
    const svc = new PaymentsService(r as any, { authorize: jest.fn() } as any, { logPaymentRefunded: jest.fn() } as any, { refundPayment: jest.fn() } as any);
    await svc.refund('o1', 'c1');
    expect(r.update).toHaveBeenCalledTimes(1);
    expect(r.update).toHaveBeenCalledWith('p1', expect.objectContaining({ status: PaymentStatus.REFUNDED }));
  });
});
