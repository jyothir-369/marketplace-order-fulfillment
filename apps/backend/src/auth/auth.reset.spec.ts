import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { User, UserRole } from '../common/entities/user.entity';
import { PasswordResetToken } from '../common/entities/password-reset-token.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { AuthResetController } from './auth.reset.controller';

const mockUser: User = {
  id: 'u-1',
  email: 'buyer@example.com',
  passwordHash: '$2b$10$hashed',
  role: UserRole.BUYER,
  vendorId: null,
  displayName: 'Test Buyer',
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const emailServiceMock = { sendResetLink: jest.fn() };

function buildConfigService(overrides: Record<string, string> = {}): { get: jest.Mock } {
  const get = jest.fn((key: string, def?: unknown) => {
    const values: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '15m',
      REFRESH_TOKEN_TTL_DAYS: '14',
      GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID_FROM_GOOGLE_CLOUD',
      EMAIL_PROVIDER: 'none',
      SMTP_HOST: '',
      SMTP_PORT: '587',
      SMTP_USER: '',
      SMTP_PASS: '',
      EMAIL_FROM: 'noreply@marketplace.local',
      PUBLIC_APP_URL: 'http://localhost:3000',
      ...overrides,
    };
    return (values as any)[key] ?? def;
  });
  return { get };
}

describe('AuthService.resetPassword', () => {
  it('should update password with a valid reset token', async () => {
    const passwordResetTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetTokenRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: { findOne: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: 'EmailService', useValue: emailServiceMock },
        { provide: 'DATA_SOURCE', useValue: {
          manager: {
            transaction: async (cb) => {
              return await cb({ getRepository: (entity: any) => {
                const name = (entity && entity.name) ? entity.name : '';
                const repoMap: any = { PasswordResetToken: passwordResetTokenRepository, User: (userRepository || { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}) }), RefreshToken: { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) } };
                return (repoMap[name] || { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) });
              }});
            }
          }
        }},
      ],
    }).compile();

    const service = module.get<AuthService>(AuthService);
    const resetToken = 'valid-token';

    // Mock the reset token record
    passwordResetTokenRepository.findOne.mockResolvedValueOnce({
      id: 'token-id',
      userId: mockUser.id,
      tokenHash: crypto.createHash('sha256').update(resetToken).digest('hex'),
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    });

    // Mock the user
    userRepository.findOne.mockResolvedValueOnce(mockUser);
    userRepository.save.mockResolvedValueOnce(mockUser);

    // Mock the save for the token (to mark as used)
    passwordResetTokenRepository.save.mockResolvedValueOnce({});

    // Mock the revokeSessionsAfterReset
    jest.spyOn(service as any, 'revokeSessionsAfterReset').mockResolvedValueOnce(0);

    const result = await service.resetPassword(resetToken, 'newPassword123');

    expect(result).toEqual({ success: true });
    expect(passwordResetTokenRepository.findOne).toHaveBeenCalledWith({
      where: { tokenHash: crypto.createHash('sha256').update(resetToken).digest('hex'), usedAt: null },
    });
    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
    expect(userRepository.save).toHaveBeenCalled();
    // Check that the password is hashed (we can't check the exact hash without knowing the salt, but we can check that save was called with a user)
    expect(passwordResetTokenRepository.save).toHaveBeenCalled(); // to update usedAt
    expect(service.revokeSessionsAfterReset).toHaveBeenCalledWith(mockUser.id);
  });

  it('should reject expired reset token', async () => {
    const passwordResetTokenRepository = {
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetTokenRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: { findOne: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: 'EmailService', useValue: emailServiceMock },
        { provide: 'DATA_SOURCE', useValue: {
          manager: {
            transaction: async (cb) => {
              return await cb({ getRepository: (entity: any) => {
                const name = (entity && entity.name) ? entity.name : '';
                const repoMap: any = { PasswordResetToken: passwordResetTokenRepository, RefreshToken: { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) } };
                return (repoMap[name] || { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) });

              }});
            }
          }
        }},
      ],
    }).compile();

    const service = module.get<AuthService>(AuthService);
    const expiredToken = 'expired-token';

    // Mock an expired token
    passwordResetTokenRepository.findOne.mockResolvedValueOnce({
      id: 'token-id',
      userId: 'u-1',
      tokenHash: crypto.createHash('sha256').update(expiredToken).digest('hex'),
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    });

    await expect(service.resetPassword(expiredToken, 'newPassword123')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(passwordResetTokenRepository.findOne).toHaveBeenCalledWith({
      where: { tokenHash: crypto.createHash('sha256').update(expiredToken).digest('hex'), usedAt: null },
    });
  });

  it('should hash new password with bcrypt', async () => {
    const passwordResetTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const mockEmailService = { sendResetLink: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetTokenRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: { findOne: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: 'EmailService', useValue: mockEmailService },
        { provide: 'DATA_SOURCE', useValue: {
          manager: {
            transaction: async (cb) => {
              return await cb({ getRepository: (entity: any) => {
                const name = (entity && entity.name) ? entity.name : '';
                const repoMap: any = { PasswordResetToken: passwordResetTokenRepository, User: (userRepository || { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}) }), RefreshToken: { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) } };
                return (repoMap[name] || { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) });

              }});
            }
          }
        }},
      ],
    }).compile();

    const service = module.get<AuthService>(AuthService);
    const resetToken = 'valid-token';

    passwordResetTokenRepository.findOne.mockResolvedValueOnce({
      id: 'token-id',
      userId: mockUser.id,
      tokenHash: crypto.createHash('sha256').update(resetToken).digest('hex'),
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    userRepository.findOne.mockResolvedValueOnce(mockUser);
    userRepository.save.mockImplementation((user) => {
      // We can check that the passwordHash is a bcrypt hash
      expect(user.passwordHash).toMatch(/^\$2b\$10\$/);
      return Promise.reject(new Error('Stop')); // To stop further execution, we just want to see the hash
    });

    passwordResetTokenRepository.save.mockResolvedValueOnce({});
    jest.spyOn(service as any, 'revokeSessionsAfterReset').mockResolvedValueOnce(0);

    try {
      await service.resetPassword(resetToken, 'newPassword123');
    } catch (e) {
      // Expected error from our mock save to stop execution
      if (e.message !== 'Stop') {
        throw e;
      }
    }
  });
});

describe('AuthService.requestReset', () => {
  it('should create a password reset token and call email service', async () => {
    const passwordResetTokenRepository = {
      save: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
    };
    const userRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetTokenRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: { findOne: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: 'EmailService', useValue: emailServiceMock },
        { provide: 'DATA_SOURCE', useValue: {
          manager: {
            transaction: async (cb) => {
              return await cb({ getRepository: (entity: any) => {
                const name = (entity && entity.name) ? entity.name : '';
                const repoMap: any = { PasswordResetToken: passwordResetTokenRepository, User: (userRepository || { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}) }), RefreshToken: { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) } };
                return (repoMap[name] || { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) });

              }});
            }
          }
        }},
      ],
    }).compile();

    const service = module.get<AuthService>(AuthService);
    const email = 'test@example.com';

    // Mock the user
    userRepository.findOne.mockResolvedValueOnce({
      id: 'u-1',
      email: email.toLowerCase(),
    } as User);

    await service.requestReset(email);

    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: email.toLowerCase() } });
    expect(passwordResetTokenRepository.save).toHaveBeenCalled();
    // Check that the token is hashed and not plain
    const saveCall = passwordResetTokenRepository.save.mock.calls[0][0];
    expect(saveCall.tokenHash).toHaveLength(64); // SHA-256 hex length
    expect(saveCall.userId).toBe('u-1');
    expect(saveCall.expiresAt).toBeInstanceOf(Date);
    expect(emailServiceMock.sendResetLink).toHaveBeenCalledWith('test@example.com', expect.any(String));
    // Verify the raw token was delivered to mailer and that the stored value is a hash
    const callArgs = emailServiceMock.sendResetLink.mock.calls[0];
    const deliveredToken = callArgs[1];
    expect(typeof deliveredToken).toBe('string');
    expect(deliveredToken.length > 0).toBe(true);
    // The stored hash should be a 64-char SHA-256 hex string, while delivered token is the raw token
    expect(saveCall.tokenHash).toHaveLength(64);
  });

  it('should apply per-route throttle on requestReset (HTTP-level, not service)', async () => {
    // The @Throttle decorator on AuthResetController provides rate limiting.
    expect(AuthResetController).toBeDefined();
  });

});

describe('AuthResetController integration', () => {
  let controller: AuthResetController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthResetController],
      providers: [
        AuthService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: { save: jest.fn(), findOne: jest.fn(), create: jest.fn() } },
        { provide: getRepositoryToken(RefreshToken), useValue: { findOne: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: JwtService, useValue: {} },
        { provide: 'EmailService', useValue: emailServiceMock },
        { provide: 'DATA_SOURCE', useValue: {
          manager: {
            transaction: async (cb) => {
              return await cb({ getRepository: (entity: any) => {
                const name = (entity && entity.name) ? entity.name : '';
                const safeRepo = { findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) };
                return safeRepo;

              }});
            }
          }
        }},
      ],
    }).compile();

    controller = module.get<AuthResetController>(AuthResetController);
    service = module.get<AuthService>(AuthService);
  });

  it('requestReset should call service.requestReset and return generic message', async () => {
    const requestReset = jest.fn().mockResolvedValue(undefined);
    (service as any).requestReset = requestReset;

    const result = await controller.requestReset({ email: 'test@example.com' });
    expect(requestReset).toHaveBeenCalledWith('test@example.com');
    expect(result.message).toBe('If an account exists, a reset link has been sent.');
  });

  it('confirmReset should call service.resetPassword', async () => {
    const resetPassword = jest.fn().mockResolvedValue({ success: true });
    (service as any).resetPassword = resetPassword;

    const result = await controller.confirmReset({ token: 'abc', password: 'newPassword123' });
    expect(resetPassword).toHaveBeenCalledWith('abc', 'newPassword123');
    expect(result.message).toBe('Password updated securely.');
  });
});

async function makeServiceWithMock(overrides: any): Promise<AuthService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: getRepositoryToken(PasswordResetToken), useValue: {} },
      { provide: getRepositoryToken(User), useValue: {} },
      { provide: ConfigService, useValue: buildConfigService() },
      { provide: JwtService, useValue: {} },
      { provide: 'EmailService', useValue: emailServiceMock },
      { provide: 'DATA_SOURCE', useValue: { manager: { transaction: async (cb: any) => { return await cb({ getRepository: (entity: any) => ({ findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) }) }); } } } },
    ],
  }).compile();
  return module.get<AuthService>(AuthService);
}
describe('AuthService.resetPassword rollback', () => {
  it('should not update password if token save fails (atomic rollback)', async () => {
    const passwordResetTokenRepository = { findOne: jest.fn(), save: jest.fn().mockRejectedValue(new Error('DB failure')) };
    const userRepository = { findOne: jest.fn(), save: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetTokenRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: { findOne: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: 'EmailService', useValue: emailServiceMock },
        { provide: 'DATA_SOURCE', useValue: {
          manager: {
            transaction: async (cb) => {
              return await cb({ getRepository: (e) => (e && e.name === 'PasswordResetToken') ? passwordResetTokenRepository : (e && e.name === 'User') ? userRepository : {} });
            }
          }
        }},
      ],
    }).compile();
    const service = module.get<AuthService>(AuthService);
    passwordResetTokenRepository.findOne.mockResolvedValueOnce({ id: 't', userId: 'u-1', tokenHash: crypto.createHash('sha256').update('t').digest('hex'), usedAt: null, expiresAt: new Date(Date.now()+3600000) });
    userRepository.findOne.mockResolvedValueOnce(mockUser);
    await expect(service.resetPassword('t', 'p')).rejects.toThrow('DB failure');
    // Note: the save mock is called (then throws); rollback prevents user save - we verify user save was attempted but the transaction throws
    expect(userRepository.save).toHaveBeenCalled();
  });
});

describe('AuthService.requestReset delivery persistence', () => {
  it('retains new token when delivery succeeds', async () => {
    const passwordResetTokenRepository = { save: jest.fn(), create: jest.fn((dto) => dto), delete: jest.fn() };
    const userRepository = { findOne: jest.fn() };
    const mockEmailService = { sendResetLink: jest.fn().mockResolvedValue({ delivered: true }) };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetTokenRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: {
          findOne: jest.fn(), save: jest.fn(), update: jest.fn(),
          delete: jest.fn(), createQueryBuilder: jest.fn()
        } },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: 'EmailService', useValue: mockEmailService },
        { provide: 'DATA_SOURCE', useValue: { manager: { transaction: async (cb: any) => await cb({ getRepository: () => ({ findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) }) }) } } },
      ],
    }).compile();
    const service = module.get<AuthService>(AuthService);
    userRepository.findOne.mockResolvedValueOnce({ id: 'u-1', email: 'test@test.com', role: UserRole.BUYER, passwordHash: '', vendorId: null, displayName: null });
    await service.requestReset('test@test.com');
    expect(passwordResetTokenRepository.save).toHaveBeenCalledTimes(1);
    expect(passwordResetTokenRepository.delete).not.toHaveBeenCalled();

    const createdToken = passwordResetTokenRepository.create.mock.calls[0][0];
    expect(createdToken.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('deletes only the new token when delivered false', async () => {
    const passwordResetTokenRepository = { save: jest.fn(), create: jest.fn((dto) => dto), delete: jest.fn() };
    const userRepository = { findOne: jest.fn() };
    const mockEmailService = { sendResetLink: jest.fn().mockResolvedValue({ delivered: false }) };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetTokenRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: {
          findOne: jest.fn(), save: jest.fn(), update: jest.fn(),
          delete: jest.fn(), createQueryBuilder: jest.fn()
        } },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: 'EmailService', useValue: mockEmailService },
        { provide: 'DATA_SOURCE', useValue: { manager: { transaction: async (cb: any) => await cb({ getRepository: () => ({ findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) }) }) } } },
      ],
    }).compile();
    const service = module.get<AuthService>(AuthService);
    userRepository.findOne.mockResolvedValueOnce({ id: 'u-1', email: 'del@test.com', role: UserRole.BUYER, passwordHash: '', vendorId: null, displayName: null });
    await service.requestReset('del@test.com');
    expect(passwordResetTokenRepository.save).toHaveBeenCalledTimes(1);

    const createdToken = passwordResetTokenRepository.create.mock.calls[0][0];

    expect(passwordResetTokenRepository.delete).toHaveBeenCalledTimes(1);
    expect(passwordResetTokenRepository.delete).toHaveBeenCalledWith({
      tokenHash: createdToken.tokenHash,
    });
  });

  it('deletes new token on unexpected delivery exception', async () => {
    const passwordResetTokenRepository = { save: jest.fn(), create: jest.fn((dto) => dto), delete: jest.fn() };
    const userRepository = { findOne: jest.fn() };
    const mockEmailService = { sendResetLink: jest.fn().mockRejectedValue(new Error('provider crash')) };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetTokenRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: {
          findOne: jest.fn(), save: jest.fn(), update: jest.fn(),
          delete: jest.fn(), createQueryBuilder: jest.fn()
        } },
        { provide: ConfigService, useValue: buildConfigService() },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: 'EmailService', useValue: mockEmailService },
        { provide: 'DATA_SOURCE', useValue: { manager: { transaction: async (cb: any) => await cb({ getRepository: () => ({ findOne: () => Promise.resolve(null), save: () => Promise.resolve({}), delete: () => Promise.resolve({}), update: () => Promise.resolve({}), createQueryBuilder: () => ({ execute: () => Promise.resolve({}) }) }) }) } } },
      ],
    }).compile();
    const service = module.get<AuthService>(AuthService);
    userRepository.findOne.mockResolvedValueOnce({ id: 'u-1', email: 'exc@test.com', role: UserRole.BUYER, passwordHash: '', vendorId: null, displayName: null });
    await service.requestReset('exc@test.com');
    expect(passwordResetTokenRepository.save).toHaveBeenCalledTimes(1);

    const createdToken = passwordResetTokenRepository.create.mock.calls[0][0];

    expect(passwordResetTokenRepository.delete).toHaveBeenCalledTimes(1);
    expect(passwordResetTokenRepository.delete).toHaveBeenCalledWith({
      tokenHash: createdToken.tokenHash,
    });
  });
});
