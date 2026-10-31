import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { VendorPortalGuard } from './vendor-portal.guard';
describe('Phase 6 VendorPortalGuard (isolation/audit)', () => {
  let guard: VendorPortalGuard;
  beforeEach(async () => {
    const mod = await Test.createTestingModule({ providers: [VendorPortalGuard] }).compile();
    guard = mod.get(VendorPortalGuard);
  });
  it('blocks cross-vendor access (tenant isolation)', () => {
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'VENDOR', vendorId: 'V1' }, params: { vendorId: 'V2' } }) }) } as any;
    expect(() => guard.canActivate(ctx as ExecutionContext)).toThrow();
  });
  it('allows own vendor access', () => {
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'VENDOR', vendorId: 'V1' }, params: { vendorId: 'V1' } }) }) } as any;
    expect(guard.canActivate(ctx as ExecutionContext)).toBeTruthy();
  });
  it('allows ADMIN separately (not duplicate of vendor guard)', () => {
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN', vendorId: null }, params: {} }) }) } as any;
    expect(guard.canActivate(ctx as ExecutionContext)).toBeTruthy();
  });
});
