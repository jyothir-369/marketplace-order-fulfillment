import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  vendorId: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stockCount: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockCount?: number;

  @IsOptional()
  isActive?: boolean;
}

export class ProductResponseDto {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  price: number;
  stockCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}