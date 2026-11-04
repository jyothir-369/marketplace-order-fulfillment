import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../common/entities/promotion.entity';
import { VendorPromotionDto, VendorPromotionUpdateDto } from './dto/vendor-promotion.dto';
import { PromotionFundingApprovalDto, PromotionFundingApprovalUpdateDto } from './dto/promotion-funding-approval.dto';

@Injectable()
export class VendorPromotionsService {
  constructor(
    @InjectRepository(Promotion) private readonly repo: Repository<Promotion>,
  ) {}

  async findByVendor(vendorId: string) {
    return this.repo.find({ where: { vendorId }, order: { createdAt: 'DESC' } });
  }

  // PROMOTION CREATION
  async create(vendorId: string, dto: PromotionFundingApprovalDto | VendorPromotionDto) {
    const fundingType = (dto as any).fundingType || 'VENDOR_FUNDED';
    if (!['VENDOR_FUNDED', 'MARKETPLACE_FUNDED', 'CO_FUNDED'].includes(fundingType)) {
      throw new BadRequestException('Invalid fundingType');
    }
    if ((dto as any).startDate && (dto as any).endDate && new Date((dto as any).startDate) > new Date((dto as any).endDate)) {
      throw new BadRequestException('startDate cannot be after endDate');
    }
    let vendorContrib: number;
    let marketplaceContrib: number;
    switch (fundingType) {
      case 'VENDOR_FUNDED': {
        vendorContrib = 100;
        marketplaceContrib = 0;
        break;
      }
      case 'MARKETPLACE_FUNDED': {
        if ((dto as any).vendorContributionPercent !== undefined && (dto as any).vendorContributionPercent !== null && (dto as any).vendorContributionPercent !== 0) {
          throw new BadRequestException('MARKETPLACE_FUNDED requires vendorContributionPercent 0');
        }
        vendorContrib = 0;
        marketplaceContrib = 100;
        break;
      }
      case 'CO_FUNDED': {
        const raw = (dto as any).vendorContributionPercent;
        if (raw === undefined || raw === null) {
          throw new BadRequestException('vendorContributionPercent required for CO_FUNDED');
        }
        const vcp = Number(raw);
        if (!Number.isFinite(vcp) || vcp < 0 || vcp > 100) {
          throw new BadRequestException('vendorContributionPercent must be 0-100');
        }
        vendorContrib = vcp;
        marketplaceContrib = 100 - vcp;
        break;
      }
    }
    const promo = this.repo.create({
      title: dto.title,
      description: (dto as any).description ?? null,
      discountPercent: dto.discountPercent,
      isActive: (dto as any).isActive ?? true,
      startDate: (dto as any).startDate ? new Date((dto as any).startDate) : null,
      endDate: (dto as any).endDate ? new Date((dto as any).endDate) : null,
      vendorId,
      fundingType,
      vendorContributionPercent: vendorContrib,
      marketplaceContributionPercent: marketplaceContrib,
      currency: 'USD', // enforced in service per instruction
      approvalState: 'PENDING',
      submittedAt: new Date(),
    });
    return this.repo.save(promo);
  }

  // PROMOTION UPDATE — non-approval fields only; approval-state mutation handled by admin endpoints
  async update(id: string, vendorId: string, dto: PromotionFundingApprovalUpdateDto | VendorPromotionUpdateDto) {
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
