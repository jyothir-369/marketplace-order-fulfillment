import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { AuthJwtPayload, AuthenticatedUser } from './auth.types';
import { RegisterDto, LoginDto, AuthUserDto, AuthTokensDto, RefreshTokenDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration / login
  // ---------------------------------------------------------------------------

  /**
   * Public registration always creates a BUYER. Higher roles (VENDOR/ADMIN/
   * OPERATIONS) are provisioned by the seed script or (later) an admin
   * endpoint — a public endpoint that accepted a `role` would be a privilege
   * escalation.
   */
  async register(dto: RegisterDto): Promise<AuthUserDto> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      role: UserRole.BUYER,
      displayName: dto.displayName || null,
      vendorId: null,
    });
    const saved = await this.userRepository.save(user);
    this.logger.log('Registered user ' + saved.id, AuthService.name);
    return this.toAuthUserDto(saved);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.userRepository.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);

    this.logger.log('User ' + user.id + ' logged in', AuthService.name);

    return {
      ...this.toAuthUserDto(user),
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTtlSeconds(),
    };
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  async me(user: AuthenticatedUser): Promise<AuthUserDto> {
    const record = await this.userRepository.findOne({ where: { id: user.id } });
    if (!record) {
      throw new NotFoundException('User not found');
    }
    return this.toAuthUserDto(record);
  }

  /**
   * Rotating refresh: revoke the presented token, issue a fresh pair. a
   * replayed old refresh token finds nothing and fails closed.
   */
  async refresh(dto: RefreshTokenDto): Promise<AuthTokensDto> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt) {
      throw new UnauthorizedException('Refresh token is invalid or revoked');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.userRepository.findOne({ where: { id: stored.userId } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Rotate: revoke old, issue new.
    await this.refreshTokenRepository.update(stored.id, { revokedAt: new Date() });
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      ...this.toAuthUserDto(user),
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTtlSeconds(),
    };
  }

  /** Idempotent — safe to call with an already-revoked or unknown token. */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('token_hash = :tokenHash AND revoked_at IS NULL', { tokenHash })
      .execute();
  }

  /** Housekeeping for expired refresh tokens (called from the module onStartup or the reconciliation scheduler). */
  async purgeExpiredRefreshTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Token helpers
  // ---------------------------------------------------------------------------

  private async signAccessToken(user: User): Promise<string> {
    const payload: AuthJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      vendorId: user.vendorId,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.jwtSecret(),
      expiresIn: this.accessTokenTtlSeconds(),
    });
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(48).toString('base64url');
    const ttlDays = Number(this.configService.get('REFRESH_TOKEN_TTL_DAYS', 14));
    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId,
        tokenHash: this.hashToken(raw),
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      }),
    );
    return raw;
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      if (this.configService.get('NODE_ENV') === 'production') {
        // Fail fast: shipping with a hard-coded dev secret in prod is a breach.
        throw new Error('JWT_SECRET must be set in production');
      }
      return 'dev-only-insecure-jwt-secret-change-me';
    }
    return secret;
  }

  private accessTokenTtlSeconds(): number {
    const raw = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const match = /^(\d+)(m|h|d|s)?$/.exec(raw);
    if (!match) return 900; // 15 minutes
    const value = Number(match[1]);
    const unit = match[2] || 's';
    const seconds = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
    return value * seconds;
  }

  private toAuthUserDto(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      vendorId: user.vendorId,
    };
  }
}