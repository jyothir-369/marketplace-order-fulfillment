import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { VendorPortalGuard } from './vendor-portal.guard';
// Additional regression: verifies isolation holds with partial params + admin role distinction preserved
// Policy-independent; no §9 calc; no DB

describe('Phase 6 VendorPortalGuard regression', () => {
  let guard: VendorPortalGuard;
  beforeEach(async () => {
    const mod = await Test.createTestingModule({ providers: [VendorPortalGuard] }).compile();
    guard = mod.get(VendorPortalGuard);
  });
  it('blocks when user has no vendorId and params request different vendor (isolation enforced)', () => {
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'VENDOR' }, params: { vendorId: 'OTHER' } }) }) } as any;
    expect(() => guard.canActivate(ctx as ExecutionContext)).toThrow();
  });
  it('allows ADMIN with no params (separate authorization, not vendor isolation bypass)', () => {
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' }, params: {} }) }) } as any;
    expect(guard.canActivate(ctx as ExecutionContext)).toBeTruthy();
  });
});
