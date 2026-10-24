import { IsString, IsNotEmpty, IsEmail, MaxLength, IsIn, IsOptional } from 'class-validator';

export class SubmitApplicationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewApplicationDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
  @IsString()
  @IsNotEmpty()
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';
}
