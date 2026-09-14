import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { UserRole } from '../../common/entities/user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

/** Safe user projection — never includes passwordHash. */
export class AuthUserDto {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  vendorId: string | null;
}

export class AuthTokensDto extends AuthUserDto {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds (frontend refresh scheduling). */
  expiresIn: number;
}