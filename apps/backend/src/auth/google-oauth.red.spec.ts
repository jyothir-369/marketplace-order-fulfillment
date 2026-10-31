import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service';
import { User, UserRole } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { PasswordResetToken } from '../common/entities/password-reset-token.entity';

describe('Google OAuth behavioral regression', () => {
  let service: AuthService;
  let users: any;
  let refreshTokens: any;
  let config: any;
  let verifySpy: jest.SpyInstance;

  const buyer: User = {
    id: 'buyer-1',
    email: 'buyer@example.com',
    passwordHash: '',
    role: UserRole.BUYER,
    vendorId: null,
    displayName: 'Google Buyer',
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const verifiedPayload = {
    sub: 'google-subject-123',
    email: 'Buyer@Example.com',
    email_verified: true,
    name: 'Google Buyer',
    picture: 'https://example.com/avatar.png',
  };

  beforeEach(async () => {
    users = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Partial<User>) => ({ ...data })),
      save: jest.fn(async (user: User) => ({
        ...user,
        id: 'buyer-created',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    refreshTokens = {
      findOne: jest.fn(),
      create: jest.fn((data: unknown) => data),
      save: jest.fn(async (row: any) => row),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
    };

    config = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'test-google-client-id';
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'REFRESH_TOKEN_TTL_DAYS') return '14';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokens },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
            create: jest.fn((data: unknown) => data),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('test-access-token'),
            verifyAsync: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: config },
        {
          provide: 'DATA_SOURCE',
          useValue: {
            manager: {
              transaction: async (callback: any) =>
                callback({
                  getRepository: () => ({
                    findOne: jest.fn(),
                    save: jest.fn(),
                  }),
                }),
            },
          },
        },
        {
          provide: 'EmailService',
          useValue: { sendResetLink: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    verifySpy = jest.spyOn(
      OAuth2Client.prototype,
      'verifyIdToken',
    );

    verifySpy.mockResolvedValue({
      getPayload: () => verifiedPayload,
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verifies the ID token against the configured Google client ID', async () => {
    const result = await (service as any).verifyGoogleIdToken('valid-test-token');

    expect(verifySpy).toHaveBeenCalledWith({
      idToken: 'valid-test-token',
      audience: 'test-google-client-id',
    });
    expect(result).toMatchObject({
      sub: 'google-subject-123',
      email: 'Buyer@Example.com',
      emailVerified: true,
      name: 'Google Buyer',
    });
  });

  it('rejects a provider verification failure without exposing provider errors', async () => {
    verifySpy.mockRejectedValueOnce(
      new Error('sensitive provider JWT parsing details'),
    );

    await expect(
      (service as any).verifyGoogleIdToken('invalid-token'),
    ).rejects.toThrow('Invalid Google ID token');
  });

  it('rejects a token without a subject or email', async () => {
    verifySpy.mockResolvedValueOnce({
      getPayload: () => ({ email_verified: true }),
    } as any);

    await expect(
      (service as any).verifyGoogleIdToken('token-with-incomplete-claims'),
    ).rejects.toThrow('Invalid Google ID token');
  });

  it('rejects an email that Google has not verified', async () => {
    verifySpy.mockResolvedValueOnce({
      getPayload: () => ({
        ...verifiedPayload,
        email_verified: false,
      }),
    } as any);

    await expect(
      (service as any).verifyGoogleIdToken('unverified-email-token'),
    ).rejects.toThrow('Google account email not verified');
  });

  it('fails with a configuration error when the Google client ID is missing', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'GOOGLE_CLIENT_ID' ? '   ' : undefined,
    );

    await expect(
      (service as any).verifyGoogleIdToken('valid-test-token'),
    ).rejects.toThrow(InternalServerErrorException);

    expect(verifySpy).not.toHaveBeenCalled();
  });

  it('rejects a blank ID token before contacting Google', async () => {
    await expect(
      (service as any).verifyGoogleIdToken('  '),
    ).rejects.toThrow(UnauthorizedException);

    expect(verifySpy).not.toHaveBeenCalled();
  });

  it('creates a new account with BUYER role and issues session tokens', async () => {
    const result = await service.googleSignIn('valid-test-token');

    expect(users.findOne).toHaveBeenCalledWith({
      where: { email: 'buyer@example.com' },
    });
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'buyer@example.com',
        role: UserRole.BUYER,
        vendorId: null,
        passwordHash: '',
      }),
    );
    expect(users.save).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: 'buyer-created',
      email: 'buyer@example.com',
      role: UserRole.BUYER,
      accessToken: 'test-access-token',
    });
    expect(result.refreshToken).toBeTruthy();
  });

  it('does not create a duplicate account for an existing email', async () => {
    users.findOne.mockResolvedValue({ ...buyer });

    const result = await service.googleSignIn('valid-test-token');

    expect(users.create).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
    expect(result.id).toBe('buyer-1');
    expect(result.email).toBe('buyer@example.com');
  });

  it('does not issue tokens if Google token verification fails', async () => {
    verifySpy.mockRejectedValueOnce(new Error('provider failure'));

    await expect(
      service.googleSignIn('invalid-token'),
    ).rejects.toThrow(UnauthorizedException);

    expect(users.findOne).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
    expect(refreshTokens.save).not.toHaveBeenCalled();
  });
});
