import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorPaymentAccount } from '../../../common/entities/vendor-payment-account.entity';
import { VendorPaymentAccountsService } from '../vendor-payment-accounts.service';
import { VendorPaymentAccountsController } from '../vendor-payment-accounts.controller';
import { AuditModule } from '../../../common/audit/audit.module';
import { AuditLog } from '../../../common/audit/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VendorPaymentAccount]), AuditModule],
  controllers: [VendorPaymentAccountsController],
  providers: [VendorPaymentAccountsService],
  exports: [VendorPaymentAccountsService],
})
export class VendorPaymentAccountsModule {}
