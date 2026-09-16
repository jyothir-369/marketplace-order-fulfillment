import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
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

  function guardWithConfig(thisJwt: { verifyAsync: jest.Mock }, config: Record<string, string>) {
    const configService = { get: jest.fn((key: string) => config[key]) };
    return new AuthGuard(thisJwt as unknown as JwtService, configService as unknown as ConfigService);
  }

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

  it('fails fast in production when JWT_SECRET is unset (500, never verifies against the dev secret)', async () => {
    const prodJwt = { verifyAsync: jest.fn() };
    const prodGuard = guardWithConfig(prodJwt, { NODE_ENV: 'production' });
    await expect(prodGuard.canActivate(contextWithHeaders({ authorization: 'Bearer whatever' })))
      .rejects.toThrow(InternalServerErrorException);
    expect(prodJwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('falls back to the dev secret with a warning in non-production when JWT_SECRET is unset', async () => {
    const devJwt = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'u-1', email: 'a@b.c', role: UserRole.BUYER, vendorId: null }),
    };
    const devGuard = guardWithConfig(devJwt, { NODE_ENV: 'development' });
    const ok = await devGuard.canActivate(contextWithHeaders({ authorization: 'Bearer x.y.z' }));
    expect(ok).toBe(true);
    expect(devJwt.verifyAsync).toHaveBeenCalledWith('x.y.z', {
      secret: 'dev-only-insecure-jwt-secret-change-me',
    });
  });
});