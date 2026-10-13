import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../common/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Inventory adjust endpoint — authorization (real behavior)', () => {
  let guard: AuthGuard;
  let rolesGuard: RolesGuard;

  beforeEach(() => {
    const jwtService = { verifyAsync: jest.fn() } as any;
    const configService = { get: jest.fn().mockReturnValue('test-secret') } as any;
    guard = new AuthGuard(jwtService, configService);

    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.VENDOR, UserRole.ADMIN]) } as any;
    rolesGuard = new RolesGuard(reflector);
  });

  it('AuthGuard: valid bearer resolves identity, attaches role/vendorId to request.user', async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'v-1', role: UserRole.VENDOR, vendorId: 'vendor-a', email: 'v@x', displayName: 'V' }) } as any;
    const g = new AuthGuard(jwt, { get: () => 'secret' } as any);
    const requestObj = { headers: { authorization: 'Bearer tok' }, user: undefined as any };
    const ctx = { switchToHttp: () => ({ getRequest: () => requestObj }) } as any;
    await g.canActivate(ctx);
    const capturedUser = requestObj.user;
    expect(capturedUser).toBeDefined();
    expect(capturedUser.role).toBe(UserRole.VENDOR);
    expect(capturedUser.vendorId).toBe('vendor-a');
    expect(capturedUser.id).toBe('v-1');
  });

  it('AuthGuard: missing bearer throws UnauthorizedException', async () => {
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) } as any;
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('RolesGuard: VENDOR passes against [VENDOR, ADMIN]', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.VENDOR, UserRole.ADMIN]) } as any;
    const rg = new RolesGuard(reflector);
    const ok = rg.canActivate({ getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.VENDOR, vendorId: 'v' } }) }) } as any);
    expect(ok).toBe(true);
  });

  it('RolesGuard: BUYER forbidden against [VENDOR, ADMIN]', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.VENDOR, UserRole.ADMIN]) } as any;
    const rg = new RolesGuard(reflector);
    const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.BUYER } }) }) } as any;
    expect(() => rg.canActivate(ctx)).toThrow();
  });

  it('RolesGuard: ADMIN passes against [VENDOR, ADMIN]', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.VENDOR, UserRole.ADMIN]) } as any;
    const rg = new RolesGuard(reflector);
    const ok = rg.canActivate({ getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.ADMIN } }) }) } as any);
    expect(ok).toBe(true);
  });

  it('controller adjustStock passes expected args to service: productId, delta, reason, correlationId, manager=undefined, user=auth user', async () => {
    const InventoryController = require('./inventory.controller').InventoryController;
    const MockInventoryService = { adjustStock: jest.fn().mockResolvedValue({ success: true, productId: 'p-1', previousStock: 0, newStock: 5, requestedQuantity: 5 }) };
    const ctrl = new InventoryController(MockInventoryService as any);
    const result = await ctrl.adjustStock('p-1', { delta: 5, reason: 'Restock' }, { role: UserRole.ADMIN, vendorId: null, id: 'a-1', email: 'a@x' } as any, 'corr-ctrl-1');
    expect(MockInventoryService.adjustStock).toHaveBeenCalledWith('p-1', 5, 'Restock', 'corr-ctrl-1', undefined, expect.objectContaining({ role: UserRole.ADMIN }));
    expect(result.success).toBe(true);
  });
});
