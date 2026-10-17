/**
 * Vendor settings DTO — validated, real fields from vendor.entity
 * No mock data; uses existing DB schema (id, name, createdAt, updatedAt)
 */
import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class UpdateVendorSettingsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}
