import { Module, Global } from '@nestjs/common';
import { VendorMockController } from './vendor-mock.controller';
import { VendorMockService } from './vendor-mock.service';

@Global()
@Module({
  controllers: [VendorMockController],
  providers: [VendorMockService],
  exports: [VendorMockService],
})
export class VendorMockModule {}