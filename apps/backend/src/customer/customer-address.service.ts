import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAddress } from './customer-address.entity';

@Injectable()
export class CustomerAddressService {
  constructor(
    @InjectRepository(CustomerAddress)
    private readonly repo: Repository<CustomerAddress>,
  ) {}

  async list(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async create(userId: string, body: Partial<CustomerAddress>) {
    if (body.label) {
      const dup = await this.repo.findOne({ where: { userId, label: body.label } });
      if (dup) throw new BadRequestException('Address label already exists');
    }
    const addr = this.repo.create({ ...body, userId });
    return this.repo.save(addr);
  }

  async findOne(userId: string, id: string) {
    const addr = await this.repo.findOne({ where: { id, userId } });
    if (!addr) throw new NotFoundException('Address not found');
    return addr;
  }

  async update(userId: string, id: string, body: Partial<CustomerAddress>) {
    const addr = await this.findOne(userId, id);
    if (body.label && body.label !== addr.label) {
      const dup = await this.repo.findOne({ where: { userId, label: body.label } });
      if (dup) throw new BadRequestException('Address label already exists');
    }
    Object.assign(addr, body);
    return this.repo.save(addr);
  }

  async delete(userId: string, id: string) {
    const addr = await this.findOne(userId, id);
    return this.repo.remove(addr);
  }
}
