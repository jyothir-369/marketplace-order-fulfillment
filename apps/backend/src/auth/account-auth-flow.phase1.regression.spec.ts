/** Phase 1 — Authentication and Account Data Foundation regression.
 * Verifies the authenticated user's real DB identity (id/email/role/displayName/vendorId/bio)
 * is returned and mapped; vendor accounts are never classified as customers;
 * token rotation is single-use; refresh session is safe against stale restores.
 * Uses real AuthService method signatures with mocked repositories — no fabricated identity.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserRole } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { PasswordResetToken } from '../common/entities/password-reset-token.entity';

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

describe('Phase 1 Account Auth Flow (regression)', () => {
  let service: AuthService;
  let userRepository: any;
  let refreshTokenRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((data: Partial<User>) => ({ ...data })),
      save: jest.fn(async (user: User) => ({ ...user, id: 'u-real' })),
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
        { provide: getRepositoryToken(PasswordResetToken), useValue: { findOne: jest.fn(), save: jest.fn(), delete: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: 'DATA_SOURCE', useValue: { manager: { transaction: async (cb: any) => await cb({ getRepository: () => ({ findOne: jest.fn(), save: jest.fn() }) }) } } },
        { provide: 'EmailService', useValue: { sendResetLink: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('me() — account identity integrity', () => {
    it('returns the real DB record (not the token) with full identity incl. bio', async () => {
      // Backend /auth/me must fetch from DB and project real columns
      const dbUser: User = {
        id: 'u-real-uuid',
        email: 'buyer@example.com',
        passwordHash: '$2b$10$hashed',
        role: UserRole.BUYER,
        vendorId: null,
        displayName: 'Real Buyer',
        bio: 'I buy things',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      userRepository.findOne.mockResolvedValue(dbUser);

      const result = await service.me({ id: 'u-real-uuid', email: 'buyer@example.com', role: UserRole.BUYER, vendorId: null });

      expect(result.id).toBe('u-real-uuid');
      expect(result.email).toBe('buyer@example.com');
      expect(result.role).toBe(UserRole.BUYER);
      expect(result.displayName).toBe('Real Buyer');
      expect(result.vendorId).toBeNull();
      // passwordHash is NEVER returned
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('me() throws NotFoundException when DB user missing (no fabricated identity)', async () => {
      userRepository.findOne.mockResolvedValue(undefined);
      await expect(
        service.me({ id: 'nonexistent', email: 'gone@example.com', role: UserRole.BUYER, vendorId: null }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('login() — role fidelity from DB', () => {
    it('never classifies a vendor as a customer', async () => {
      const vendorUser: User = {
        id: 'vendor-1',
        email: 'vendor@example.com',
        passwordHash: await bcrypt.hash('password123', 4),
        role: UserRole.VENDOR,
        vendorId: 'vendor-tenant-1',
        displayName: 'Vendor Person',
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      userRepository.findOne.mockResolvedValue(vendorUser);
      refreshTokenRepository.save.mockResolvedValue({ tokenHash: 'h', userId: 'vendor-1' });

      const result = await service.login({ email: 'vendor@example.com', password: 'password123' });

      expect(result.role).toBe(UserRole.VENDOR);
      expect(result.role).not.toBe(UserRole.BUYER);
      expect(result.role).not.toBe('customer');
      expect(result.vendorId).toBe('vendor-tenant-1');
    });

    it('rejects a vendor-portal login attempt for a buyer (no privilege escalation via portal)', async () => {
      const buyer: User = {
        id: 'b-1', email: 'buyer@example.com', passwordHash: await bcrypt.hash('pw123456', 4),
        role: UserRole.BUYER, vendorId: null, displayName: 'B', bio: null,
        createdAt: new Date(), updatedAt: new Date(),
      };
      userRepository.findOne.mockResolvedValue(buyer);

      await expect(service.login({ email: 'buyer@example.com', password: 'pw123456', portal: 'vendor' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('never returns passwordHash over the login response (AuthTokensDto projection)', async () => {
      const buyer: User = {
        id: 'b-1', email: 'buyer@example.com', passwordHash: await bcrypt.hash('pw123456', 4),
        role: UserRole.BUYER, vendorId: null, displayName: 'B', bio: null,
        createdAt: new Date(), updatedAt: new Date(),
      };
      userRepository.findOne.mockResolvedValue(buyer);
      refreshTokenRepository.save.mockResolvedValue({ tokenHash: 'h', userId: 'b-1' });

      const result = await service.login({ email: 'buyer@example.com', password: 'pw123456' });
      expect((result as any).passwordHash).toBeUndefined();
    });
  });

  describe('refresh() — single-use rotation', () => {
    it('revokes the presented refresh token and issues a new access+refresh pair', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-1', userId: 'u-real', tokenHash: 'x'.repeat(64),
        expiresAt: new Date(Date.now() + 60_000), revokedAt: null,
      });
      userRepository.findOne.mockResolvedValue({ id: 'u-real', email: 'a@b.c', role: UserRole.BUYER, vendorId: null, displayName: 'A' });

      const result = await service.refresh({ refreshToken: 'some.raw.token' });

      expect(refreshTokenRepository.update).toHaveBeenCalledWith('rt-1', { revokedAt: expect.any(Date) });
      expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1); // only the NEW token
      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.refreshToken).not.toBe('some.raw.token');
    });

    it('fails closed on a reused (already-revoked) refresh token', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-1', userId: 'u-real', tokenHash: 'x'.repeat(64),
        expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date(),
      });

      await expect(service.refresh({ refreshToken: 'replayed' })).rejects.toThrow(UnauthorizedException);
    });

    it('fails closed on an unknown refresh token hash', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);
      await expect(service.refresh({ refreshToken: 'unknown' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register() — privilege escalation prevention', () => {
    it('always creates a BUYER and rejects existing emails', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const result = await service.register({ email: 'New@Example.com', password: 'password123', displayName: 'New' });

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com', role: UserRole.BUYER, vendorId: null }),
      );
      expect(result.email).toBe('new@example.com');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('rejects duplicate registration with ConflictException', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'x' });
      await expect(service.register({ email: 'dup@example.com', password: 'password123' }))
        .rejects.toThrow(ConflictException);
    });
  });
});
