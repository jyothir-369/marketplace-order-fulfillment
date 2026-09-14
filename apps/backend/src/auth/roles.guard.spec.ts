import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../common/entities/user.entity';

function guardWithRoles(requiredRoles: UserRole[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  };
  return new RolesGuard(reflector as unknown as Reflector);
}

function contextWithUser(user: any) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: jest.fn().mockReturnValue({ user }) }),
  } as any;
}

describe('RolesGuard', () => {
  it('passes an authenticated user with an allowed role', () => {
    const guard = guardWithRoles([UserRole.ADMIN, UserRole.OPERATIONS]);
    expect(guard.canActivate(contextWithUser({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('forbids an authenticated user with a disallowed role', () => {
    const guard = guardWithRoles([UserRole.ADMIN, UserRole.OPERATIONS]);
    expect(() => guard.canActivate(contextWithUser({ role: UserRole.BUYER }))).toThrow(ForbiddenException);
  });

  it('forbids an unauthenticated request', () => {
    const guard = guardWithRoles([UserRole.ADMIN]);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });

  it('passes when no roles are declared (auth-only route)', () => {
    const guard = guardWithRoles(undefined);
    expect(guard.canActivate(contextWithUser(undefined))).toBe(true);
  });
});