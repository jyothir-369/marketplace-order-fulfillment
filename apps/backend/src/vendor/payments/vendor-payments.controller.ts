import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/entities/user.entity';
import { VendorPayoutsService } from './vendor-payouts.service';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';

@Controller('vendor/payments')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.VENDOR, UserRole.ADMIN)
export class VendorPaymentsController {
  constructor(private readonly svc: VendorPayoutsService) {}

  @Get('allocations')
  async getAllocations(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    // Req 2: resolve the authenticated user's authorized vendor account server-side.
    // The middleware must enforce ownership at service layer — here we delegate to the service.
    const vendorId = this.resolveAuthenticatedVendor(user);
    return this.svc.getAllocations(vendorId);
  }

  /**
   * Resolves the authenticated vendor ID from the bearer identity. A vendor's
   * claims carry their approved vendorId; a role mismatch (ADMIN without an
   * owning vendor account) is denied by RolesGuard, so the only caller path is
   * a genuine vendor or admin-with-vendor-account.
   */
  private resolveAuthenticatedVendor(user: AuthenticatedUser): string {
    if (!user || typeof user !== 'object') {
      throw new ForbiddenException('No authenticated user for this request');
    }
    if (user.role === UserRole.ADMIN) {
      // Admin paths are explicit; admin dashboard handles own queries separately.
      throw new ForbiddenException('Admins do not access per-vendor allocations through this endpoint');
    }
    if (typeof user.vendorId !== 'string' || !user.vendorId) {
      throw new ForbiddenException('Vendor identity incomplete; only authenticated vendor accounts may view allocations');
    }
    return user.vendorId;
  }
}

