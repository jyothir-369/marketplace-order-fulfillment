import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../common/entities/promotion.entity';
import { VendorPromotionDto, VendorPromotionUpdateDto } from './dto/vendor-promotion.dto';

@Injectable()
export class VendorPromotionsService {
  constructor(
    @InjectRepository(Promotion) private readonly repo: Repository<Promotion>,
  ) {}

  async findByVendor(vendorId: string) {
    return this.repo.find({ where: { vendorId }, order: { createdAt: 'DESC' } });
  }

  async create(vendorId: string, dto: VendorPromotionDto) {
    if (dto.startDate && dto.endDate && new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new BadRequestException('startDate cannot be after endDate');
    }
    const promo = this.repo.create({
      title: dto.title,
      description: dto.description ?? null,
      discountPercent: dto.discountPercent,
      isActive: dto.isActive ?? true,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      vendorId,
    });
    return this.repo.save(promo);
  }

  async update(id: string, vendorId: string, dto: VendorPromotionUpdateDto) {
    const existing = await this.repo.findOne({ where: { id, vendorId } });
    if (!existing) throw new NotFoundException('Promotion not found');
    const effectiveStart = (dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : (existing.startDate ? new Date(existing.startDate) : null));
    const effectiveEnd = (dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : (existing.endDate ? new Date(existing.endDate) : null));
    if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
      throw new BadRequestException('startDate cannot be after endDate');
    }
    const allowed: Partial<Promotion> = {};
    if (dto.title !== undefined) allowed.title = dto.title;
    if (dto.description !== undefined) allowed.description = dto.description ?? null;
    if (dto.discountPercent !== undefined) allowed.discountPercent = dto.discountPercent;
    if (dto.isActive !== undefined) allowed.isActive = dto.isActive;
    if (dto.startDate !== undefined) allowed.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) allowed.endDate = dto.endDate ? new Date(dto.endDate) : null;
    await this.repo.update({ id, vendorId }, allowed);
    return this.repo.findOne({ where: { id, vendorId } });
  }

  async remove(id: string, vendorId: string) {
    const existing = await this.repo.findOne({ where: { id, vendorId } });
    if (!existing) throw new NotFoundException('Promotion not found');
    await this.repo.delete({ id, vendorId });
    return existing;
  }
}
