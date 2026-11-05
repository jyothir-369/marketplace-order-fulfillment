import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorPaymentAllocation } from '../../common/entities/vendor-payment-allocation.entity';

@Injectable()
export class AllocationRepo {
  constructor(
    @InjectRepository(VendorPaymentAllocation)
    private readonly repo: Repository<VendorPaymentAllocation>,
  ) {}

  async findByOrderVendor(orderReference: string, vendorId: string) {
    return this.repo.findOne({ where: { orderReference, vendorId } });
  }

  async findByIdempotencyKey(key: string) {
    return this.repo.findOne({ where: { idempotencyKey: key } });
  }

  async save(entity: Partial<VendorPaymentAllocation>) {
    return this.repo.save(entity);
  }
}
