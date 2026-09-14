import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { UserRole } from '../common/entities/user.entity';

function contextWithHeaders(headers: Record<string, string>) {
  // Both the guard and the assertion must read/write the SAME request object.
  const request = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };
    guard = new AuthGuard(jwtService as unknown as JwtService, configService as unknown as ConfigService);
  });

  it('attaches the verified identity to request.user', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'u-1', email: 'v@example.com', role: UserRole.VENDOR, vendorId: 'vendor-1',
    });
    const context = contextWithHeaders({ authorization: 'Bearer valid.jwt.token' });

    const ok = await guard.canActivate(context);

    expect(ok).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual({ id: 'u-1', email: 'v@example.com', role: UserRole.VENDOR, vendorId: 'vendor-1' });
  });

  it('rejects a missing bearer header', async () => {
    await expect(guard.canActivate(contextWithHeaders({}))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(contextWithHeaders({ authorization: 'Basic abc' }))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid or expired token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(guard.canActivate(contextWithHeaders({ authorization: 'Bearer bad.token' }))).rejects.toThrow(UnauthorizedException);
  });
});