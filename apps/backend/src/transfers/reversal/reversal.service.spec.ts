import { Test } from '@nestjs/testing';
import { ReversalService } from './reversal.service';
describe('ReversalService (policy-independent)', () => {
  it('blocks missing policy', async () => {
    const mod = await Test.createTestingModule({ providers: [ReversalService] }).compile();
    const svc = mod.get(ReversalService);
    const r = await svc.submitReversal('TRX-1');
    expect(r.blocked).toBe(true); expect(r.state).toBe('BLOCKED_POLICY_MISSING');
  });
  it('accepts with valid policy (no provider submission)', async () => {
    const mod = await Test.createTestingModule({ providers: [ReversalService] }).compile();
    const svc = mod.get(ReversalService);
    const r = await svc.submitReversal('TRX-2', { commission_model: 'percent' });
    expect(r.blocked).toBeFalsy();
  });
});
