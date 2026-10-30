import { Module } from '@nestjs/common';
import { AdminVendorPortalGuard } from '../admin-vendor-portal.guard';
@Module({ providers: [AdminVendorPortalGuard], exports: [AdminVendorPortalGuard] })
export class AdminVendorPortalModule {}
