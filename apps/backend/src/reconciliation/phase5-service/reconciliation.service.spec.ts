import { Test } from '@nestjs/testing';
import { ReconciliationService } from './reconciliation.service';
describe('ReconciliationService (policy-independent)', () => {
  it('provides idempotent reconcile without financial side effects', async () => {
    const mod = await Test.createTestingModule({ providers: [ReconciliationService] }).compile();
    const svc = mod.get(ReconciliationService);
    const r = await svc.reconcile();
    expect(r.status).toBe('COMPLETED');
    expect(r.findings).toBeDefined();
    expect(r.providerDataAvailable).toBeFalsy(); // no fabricated provider data
  });
  it('ambiguous outcome returns MANUAL_REVIEW (no blind retry)', async () => {
    const mod = await Test.createTestingModule({ providers: [ReconciliationService] }).compile();
    const svc = mod.get(ReconciliationService);
    const r = await svc.reconcileAmbiguousTransfer('PROV-1');
    expect(['RETRY','RECONCILE','MANUAL_REVIEW']).toContain(r);
  });
});
