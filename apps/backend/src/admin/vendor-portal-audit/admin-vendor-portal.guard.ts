import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
@Injectable()
export class AdminVendorPortalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin role required');
    // Never allow unrestricted "mark paid" bypass; only audited corrections after verification
    return true;
  }
}
