import { Test } from '@nestjs/testing';
import { RefundService } from './refund.service';

describe('RefundService (policy-independent, fail-closed)', () => {
  let svc: RefundService;
  beforeEach(async () => {
    const mod = await Test.createTestingModule({ providers: [RefundService] }).compile();
    svc = mod.get(RefundService);
  });
  it('blocks missing policy (§4 rules UNDECIDED)', () => {
    const r = svc.submitRefund('R1', 500);
    expect(r.blocked).toBe(true);
    expect(r.state).toBe('BLOCKED_POLICY_MISSING');
    expect(r.reason).toContain('policy-missing');
  });
  it('blocks negative amount (fail-closed)', () => {
    const r = svc.submitRefund('R2', -100, { commission_model: 'percent' });
    expect(r.blocked).toBe(true);
  });
  it('accepts with valid policy (no live provider; submitted remains false by design)', () => {
    const r = svc.submitRefund('R3', 500, { commission_model: 'percent', refund_allocation: 'manual' });
    expect(r.blocked).toBeFalsy();
    expect(r.state).toBe('SUBMITTED');
  });
});
