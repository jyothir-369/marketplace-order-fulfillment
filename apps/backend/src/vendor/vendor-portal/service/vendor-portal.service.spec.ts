import { Test } from '@nestjs/testing';
import { VendorPortalService } from './vendor-portal.service';
describe('Phase 6 VendorPortalService (independent)', () => {
  it('returns structured view without live DB / no §9 calc', async () => {
    const mod = await Test.createTestingModule({ providers: [VendorPortalService] }).compile();
    const svc = mod.get(VendorPortalService);
    const r = svc.getStatus({ vendorId: 'VTEST' });
    expect(r.vendorId).toBe('VTEST');
    expect(r.grossSalesAvailable).toBeFalsy();
    expect(r.prerequisitesMissing).toContain('A');
    expect(r.auditRef).toContain('independent');
  });
  it('transfer status blocked with prerequisites listed', async () => {
    const mod = await Test.createTestingModule({ providers: [VendorPortalService] }).compile();
    const svc = mod.get(VendorPortalService);
    const r = svc.getTransferStatus({ vendorId: 'VTEST' });
    expect(r.noUnrestrictedBypass).toBeTruthy();
    expect(r.prerequisites).toContain('B');
  });
});
