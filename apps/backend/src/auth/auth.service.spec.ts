import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { User, UserRole } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';

const mockUser: User = {
  id: 'u-1',
  email: 'buyer@example.com',
  passwordHash: '$2b$10$hashed',
  role: UserRole.BUYER,
  vendorId: null,
  displayName: 'Test Buyer',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildConfigService(overrides: Record<string, string> = {}): { get: jest.Mock } {
  const get = jest.fn((key: string, def?: unknown) => {
    const values: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '15m',
      REFRESH_TOKEN_TTL_DAYS: '14',
      ...overrides,
    };
    return (values as any)[key] ?? def;
  });
  return { get };
}

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let refreshTokenRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((data: Partial<User>) => ({ ...data })),
      save: jest.fn(async (user: User) => ({ ...user, id: 'u-new' })),
      update: jest.fn(),
    };
    refreshTokenRepository = {
      findOne: jest.fn(),
      create: jest.fn((data: unknown) => data),
      save: jest.fn(async (row: any) => row),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-access-token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: buildConfigService() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('creates a BUYER account (never a privileged role)', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const dto = { email: 'New@Example.com', password: 'password123', displayName: 'New' };

      const result = await service.register(dto);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com', role: UserRole.BUYER, vendorId: null }),
      );
      expect(result.email).toBe('new@example.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('rejects a duplicate email with ConflictException', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      await expect(service.register({ email: 'buyer@example.com', password: 'password123' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a token pair on valid credentials', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, passwordHash: await bcrypt.hash('password123', 4) });

      const result = await service.login({ email: 'buyer@example.com', password: 'password123' });

      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u-1' }),
      );
      // Refresh token is stored hashed, never raw.
      const storedRow = (refreshTokenRepository.save as jest.Mock).mock.calls[0][0] as any;
      expect(storedRow.tokenHash).not.toBe(result.refreshToken);
      expect(storedRow.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('rejects a bad password', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, passwordHash: await bcrypt.hash('password123', 4) });

      await expect(service.login({ email: 'buyer@example.com', password: 'wrong-password' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown email', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.login({ email: 'nobody@example.com', password: 'password123' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and issues a fresh pair', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-1',
        userId: 'u-1',
        tokenHash: 'x'.repeat(64),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.refresh({ refreshToken: 'some.raw.token' });

      expect(refreshTokenRepository.update).toHaveBeenCalledWith('rt-1', { revokedAt: expect.any(Date) });
      expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1); // the new token
      expect(result.accessToken).toBe('jwt-access-token');
    });

    it('rejects a revoked or unknown refresh token', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);
      await expect(service.refresh({ refreshToken: 'stale' })).rejects.toThrow(UnauthorizedException);

      refreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-1', userId: 'u-1', tokenHash: 'x'.repeat(64),
        expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date(),
      });
      await expect(service.refresh({ refreshToken: 'same' })).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired refresh token', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-1', userId: 'u-1', tokenHash: 'x'.repeat(64),
        expiresAt: new Date(Date.now() - 60_000), revokedAt: null,
      });
      await expect(service.refresh({ refreshToken: 'old' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout / purge', () => {
    it('revokes the refresh token idempotently via a parameterised update', async () => {
      const execute = jest.fn().mockResolvedValue({ affected: 1 });
      refreshTokenRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute,
      });

      await service.logout('raw.token');

      expect(execute).toHaveBeenCalled();
    });

    it('purges expired refresh tokens', async () => {
      refreshTokenRepository.delete.mockResolvedValue({ affected: 3 });
      const count = await service.purgeExpiredRefreshTokens();
      expect(count).toBe(3);
    });
  });

  describe('token helpers', () => {
    it('hashes refresh tokens with SHA-256 (64 hex chars)', () => {
      const raw = crypto.randomBytes(48).toString('base64url');
      const hash = (service as any).hashToken(raw);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).not.toBe(raw);
    });

    it('parses m/h/s/d TTL suffixes into seconds', () => {
      expect((service as any).accessTokenTtlSeconds()).toBe(900);
      expect((service as any).accessTokenTtlSeconds.call({ configService: buildConfigService({ JWT_EXPIRES_IN: '2h' }) })).toBe(7200);
      expect((service as any).accessTokenTtlSeconds.call({ configService: buildConfigService({ JWT_EXPIRES_IN: '90s' }) })).toBe(90);
    });
  });

  describe('me', () => {
    it('returns the current user without the password hash', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.me({ id: 'u-1', email: 'buyer@example.com', role: UserRole.BUYER, vendorId: null });
      expect(result.email).toBe('buyer@example.com');
      expect((result as any).passwordHash).toBeUndefined();
    });
  });
});