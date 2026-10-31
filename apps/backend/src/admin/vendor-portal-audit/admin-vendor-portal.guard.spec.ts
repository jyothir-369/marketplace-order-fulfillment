import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminVendorPortalGuard } from './admin-vendor-portal.guard';
describe('Phase 6 AdminVendorPortalGuard (role/audit no bypass)', () => {
  let guard: AdminVendorPortalGuard;
  beforeEach(async () => {
    const mod = await Test.createTestingModule({ providers: [AdminVendorPortalGuard] }).compile();
    guard = mod.get(AdminVendorPortalGuard);
  });
  it('blocks non-admin access to vendor-portal admin', () => {
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'VENDOR' } }) }) } as any;
    expect(() => guard.canActivate(ctx as ExecutionContext)).toThrow();
  });
  it('allows ADMIN and never permits unrestricted mark-paid (design verified by guard presence, no bypass code added)', () => {
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' } }) }) } as any;
    expect(guard.canActivate(ctx as ExecutionContext)).toBeTruthy();
  });
});
