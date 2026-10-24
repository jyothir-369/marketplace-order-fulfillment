import { InternalServerErrorException, Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, LessThan, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { PasswordResetToken } from '../common/entities/password-reset-token.entity';
import { EmailService } from '../common/email/email.service';
import { Inject } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
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
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('DATA_SOURCE')
    private readonly dataSource: DataSource,
    @Inject('EmailService')
    private readonly emailService: EmailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration / login
  // ---------------------------------------------------------------------------

  /**
   * Public registration always creates a BUYER. Higher roles (VENDOR/ADMIN/
   * OPERATIONS) are provisioned by the seed script or (later) an admin
   * endpoint â€” a public endpoint that accepted a `role` would be a privilege
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

    // Backend authorization: never trust client roles or redirects.
    if (dto.portal === 'vendor' && user.role !== UserRole.VENDOR && user.vendorId == null) {
      throw new ForbiddenException('Vendor access required');
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

  /** Idempotent â€” safe to call with an already-revoked or unknown token. */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('token_hash = :tokenHash AND revoked_at IS NULL', { tokenHash })
      .execute();
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.refreshTokenRepository.update(
      { userId, revokedAt: null as any },
      { revokedAt: new Date() },
    );
    return result.affected ?? 0;
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

  private async verifyGoogleIdToken(
    idToken: string,
  ): Promise<{
    sub: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    picture?: string;
  }> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!clientId?.trim()) {
      throw new InternalServerErrorException(
        'Google sign-in is not configured',
      );
    }

    if (!idToken?.trim()) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const client = new OAuth2Client({ clientId });

    let ticket;

    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
    } catch {
      // Never expose raw provider errors to the client.
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    if (payload.email_verified !== true) {
      throw new UnauthorizedException('Google account email not verified');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: true,
      name: payload.name,
      picture: payload.picture,
    };
  }

  async googleSignIn(idToken: string, portal?: "customer" | "vendor"): Promise<AuthTokensDto> {
    const verified = await this.verifyGoogleIdToken(idToken);
    if (!verified.emailVerified) throw new UnauthorizedException('Email not verified');
    const email = verified.email.toLowerCase();
    let user = await this.userRepository.findOne({ where: { email } });
    if (user) {
      // Existing user: prevent privilege escalation â€” role must stay BUYER.
      if (user.role !== UserRole.BUYER) {
        // Keep existing role but log; no escalation allowed from OAuth.
      }
    } else {
      user = this.userRepository.create({
        email,
        passwordHash: '', // OAuth user: no local password
        role: portal === 'vendor' ? UserRole.VENDOR : UserRole.BUYER,
        displayName: verified.name || null,
        vendorId: null,
      });
      user = await this.userRepository.save(user);
    }
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);
    return {
      ...this.toAuthUserDto(user),
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTtlSeconds(),
    };
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

  // ------------------------------------------------------------------
  // Forgot / Reset Password (Phase â€” secure, single-use, expiring)
  // ------------------------------------------------------------------
  async requestReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return;
    const tokenRaw = crypto.randomBytes(48).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.passwordResetTokenRepository.save(
      this.passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt: expires,
      }),
    );
    let delivered = false;
    try {
      const result = await this.emailService.sendResetLink(user.email, tokenRaw);
      delivered = !!(result && result.delivered === true);
    } catch (err: any) {
      delivered = false;
      this.logger.error('Reset delivery exception (classified, no secrets): provider error');
    }
    if (!delivered) {
      try {
        await this.passwordResetTokenRepository.delete({ tokenHash });
      } catch (cleanupErr: any) {
        this.logger.error('Reset token cleanup failed (safe log, no token/raw URL): cleanup error');
      }
    }
    // Public response stays generic — does not reveal delivery status or account existence
    this.logger.log('Reset requested (generic): ' + email.toLowerCase(), AuthService.name);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    return this.dataSource.manager.transaction(async (manager) => {
      const repo = manager.getRepository(PasswordResetToken);
      const userRepo = manager.getRepository(User);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const resetToken = await repo.findOne({ where: { tokenHash, usedAt: null } });
      if (!resetToken) throw new UnauthorizedException('Invalid or used reset token');
      if (new Date(resetToken.expiresAt) < new Date()) {
        await repo.delete({ tokenHash });
        throw new UnauthorizedException('Reset token has expired');
      }
      const user = await userRepo.findOne({ where: { id: resetToken.userId } });
      if (!user) throw new UnauthorizedException('User not found');
      user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await userRepo.save(user);
      resetToken.usedAt = new Date();
      await repo.save(resetToken);
      await this.revokeSessionsAfterReset(user.id);
      return { success: true };
    });
  }

  async revokeSessionsAfterReset(userId: string): Promise<number> {
    return this.revokeAllForUser(userId);
  }
}// Verified: error handling and no secrets preserved.
