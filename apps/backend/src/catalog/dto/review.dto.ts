import { IsInt, Min, Max, IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ReviewDto {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export class ReviewListResponseDto {
  reviews: ReviewDto[];
  averageRating: number;
  totalReviews: number;
}
