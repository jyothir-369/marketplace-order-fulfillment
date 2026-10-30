import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
@Injectable()
export class VendorPortalGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user; // set by AuthGuard / CurrentUser
    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.role === 'ADMIN') return true; // admin can view admin views separately
    if (user.role !== 'VENDOR') throw new ForbiddenException('Vendor role required');
    const targetVendor = req.params.vendorId || req.body.vendorId || req.query.vendorId;
    // Strict isolation: vendor can only access own records
    if (targetVendor && String(user.vendorId || user.id) !== String(targetVendor)) {
      throw new ForbiddenException('Cross-vendor access denied');
    }
    return true;
  }
}
