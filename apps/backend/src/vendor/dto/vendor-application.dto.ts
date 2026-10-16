import { IsString, IsNotEmpty, IsEmail, MaxLength, IsIn } from 'class-validator';

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
  @IsNotEmpty()
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';
}
