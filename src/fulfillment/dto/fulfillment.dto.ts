import { IsUUID, IsString, IsOptional, IsEnum } from 'class-validator';
import { FulfillmentStatus } from '../../common/entities';

export class SyncJobDto {
  @IsUUID()
  orderLineItemId: string;

  @IsUUID()
  orderId: string;

  @IsUUID()
  vendorId: string;

  @IsString()
  correlationId: string;
}

export class ReconciliationResultDto {
  processed: number;
  resolved: number;
  stillAmbiguous: number;
  errors: string[];
}

export class ManualResolutionDto {
  @IsEnum(FulfillmentStatus)
  newStatus: FulfillmentStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  vendorReference?: string;
}