import { Module } from '@nestjs/common';
import { VendorPortalGuard } from '../vendor-portal.guard';
@Module({ providers: [VendorPortalGuard], exports: [VendorPortalGuard] })
export class VendorPortalModule {}
