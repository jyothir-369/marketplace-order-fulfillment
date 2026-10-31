import { IsString, IsNotEmpty, Length } from 'class-validator';

export class LinkVendorPaymentAccountDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  vendorId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  linkedAccountId: string;
}
