import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../common/entities/promotion.entity';

@Injectable()
export class VendorPromotionsService {
  constructor(
    @InjectRepository(Promotion) private readonly repo: Repository<Promotion>,
  ) {}

  async findByVendor(vendorId: string) {
    return this.repo.find({ where: { vendorId }, order: { createdAt: 'DESC' } });
  }

  async create(vendorId: string, dto: any) {
    const promo = this.repo.create({ ...dto, vendorId });
    return this.repo.save(promo);
  }

  async update(id: string, vendorId: string, dto: any) {
    const existing = await this.repo.findOne({ where: { id, vendorId } });
    if (!existing) throw new NotFoundException('Promotion not found');
    await this.repo.update({ id, vendorId }, dto);
    return this.repo.findOne({ where: { id, vendorId } });
  }

  async remove(id: string, vendorId: string) {
    const existing = await this.repo.findOne({ where: { id, vendorId } });
    if (!existing) throw new NotFoundException('Promotion not found');
    await this.repo.delete({ id, vendorId });
    return existing;
  }
}
