import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../common/entities/user.entity';
import { CustomerAddress } from './customer-address.entity';
import { CustomerController } from './customer.controller';
import { CustomerAddressController } from './customer-address.controller';
import { CustomerService } from './customer.service';
import { CustomerAddressService } from './customer-address.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, CustomerAddress])],
  controllers: [CustomerController, CustomerAddressController],
  providers: [CustomerService, CustomerAddressService],
  exports: [CustomerService, CustomerAddressService],
})
export class CustomerModule {}
