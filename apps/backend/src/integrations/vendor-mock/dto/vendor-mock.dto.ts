import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum VendorResponseType {
  SUCCESS = 'success',
  FAILURE = 'failure',
  TIMEOUT = 'timeout',
  DUPLICATE = 'duplicate',
}

export class VendorFulfillmentRequestDto {
  @IsString()
  orderId: string;

  @IsString()
  lineItemId: string;

  @IsString()
  productId: string;

  @IsString()
  vendorId: string;

  @IsNumber()
  quantity: number;

  @IsString()
  correlationId: string;
}

export class VendorFulfillmentResponseDto {
  success: boolean;
  vendorReference?: string;
  message?: string;
  responseType: VendorResponseType;
}

export class VendorConfigDto {
  @IsNumber()
  @IsOptional()
  successRate?: number;

  @IsNumber()
  @IsOptional()
  timeoutMs?: number;

  @IsEnum(VendorResponseType)
  @IsOptional()
  forcedResponse?: VendorResponseType;
}