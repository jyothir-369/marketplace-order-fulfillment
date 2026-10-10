import { IsString, IsOptional, IsBoolean, IsUUID, Length, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsString() @Length(1, 50) label?: string;
  @IsString() @MinLength(1) street: string;
  @IsString() @MinLength(1) city: string;
  @IsString() @Length(1, 100) @IsOptional() state?: string;
  @IsString() @Length(1, 20) @IsOptional() zip?: string;
  @IsString() @Length(1, 100) @IsOptional() country?: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsString() @Length(1, 50) @IsOptional() label?: string;
  @IsString() @MinLength(1) @IsOptional() street?: string;
  @IsString() @MinLength(1) @IsOptional() city?: string;
  @IsString() @Length(1, 100) @IsOptional() state?: string;
  @IsString() @Length(1, 20) @IsOptional() zip?: string;
  @IsString() @Length(1, 100) @IsOptional() country?: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
}
