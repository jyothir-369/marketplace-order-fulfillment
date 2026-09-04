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

  @IsString()
  @IsOptional()
  category?: string;
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

  @IsString()
  @IsOptional()
  category?: string;
}

export class ProductResponseDto {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  price: number;
  stockCount: number;
  category: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class VendorResponseDto {
  id: string;
  name: string;
  productCount: number;
  activeProductCount: number;
  createdAt: Date;
}
