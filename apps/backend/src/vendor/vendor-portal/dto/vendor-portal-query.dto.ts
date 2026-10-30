import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
export class VendorPortalQueryDto {
  @IsString() @IsNotEmpty() vendorId: string;
  @IsOptional() @IsString() orderReference?: string;
  // Intentionally no amount-modifying fields; no override fields; no unrestricted bypass
}
