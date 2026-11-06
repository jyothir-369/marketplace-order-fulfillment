import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min, Max, IsBoolean, IsDateString, IsIn } from 'class-validator';

export class PromotionFundingApprovalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(100)
  discountPercent: number;

  @IsIn(['VENDOR_FUNDED', 'MARKETPLACE_FUNDED', 'CO_FUNDED'])
  @IsOptional()
  fundingType?: 'VENDOR_FUNDED' | 'MARKETPLACE_FUNDED' | 'CO_FUNDED';

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  @IsOptional()
  vendorContributionPercent?: number;

  @IsString()
  @IsIn(['USD'])
  @IsOptional()
  currency?: 'USD';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}

export class PromotionFundingApprovalUpdateDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @IsIn(['VENDOR_FUNDED', 'MARKETPLACE_FUNDED', 'CO_FUNDED'])
  @IsOptional()
  fundingType?: 'VENDOR_FUNDED' | 'MARKETPLACE_FUNDED' | 'CO_FUNDED';

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  @IsOptional()
  vendorContributionPercent?: number;

  @IsString()
  @IsOptional()
  @IsIn(['USD'])
  currency?: 'USD';

  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  @IsOptional()
  approvalState?: 'PENDING' | 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}
