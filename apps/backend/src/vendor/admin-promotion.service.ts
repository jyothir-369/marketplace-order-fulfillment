import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../common/entities/promotion.entity';
import { UserRole } from '../common/entities/user.entity';

@Injectable()
export class AdminPromotionService {
  constructor(
    @InjectRepository(Promotion) private readonly repo: Repository<Promotion>,
  ) {}

  async approve(id: string, adminId: string) {
    const result = await this.repo.query(
      `UPDATE promotions SET approval_state = 'APPROVED', approved_by = $1, approved_at = NOW() WHERE id = $2 AND approval_state = 'PENDING' RETURNING *`,
      [adminId, id],
    );
    if (!result || result.length === 0) {
      const existing = await this.repo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('Promotion not found');
      if (existing.approvalState !== 'PENDING') {
        throw new BadRequestException(`Cannot approve promotion in state ${existing.approvalState}`);
      }
      throw new BadRequestException('Failed to approve promotion');
    }
    return result[0];
  }

  async reject(id: string, adminId: string) {
    const result = await this.repo.query(
      `UPDATE promotions SET approval_state = 'REJECTED', approved_by = $1, approved_at = NOW() WHERE id = $2 AND approval_state = 'PENDING' RETURNING *`,
      [adminId, id],
    );
    if (!result || result.length === 0) {
      const existing = await this.repo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('Promotion not found');
      if (existing.approvalState !== 'PENDING') {
        throw new BadRequestException(`Cannot reject promotion in state ${existing.approvalState}`);
      }
      throw new BadRequestException('Failed to reject promotion');
    }
    return result[0];
  }

  static readonly allowedRoles = [UserRole.ADMIN, UserRole.OPERATIONS];
}
