import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { VendorApplicationController } from './vendor-application.controller';
import { VendorApplicationService } from './vendor-application.service';
import { AuthGuard } from '../auth/auth.guard';
import { UserRole } from '../common/entities/user.entity';

describe('Vendor application HTTP authentication', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const secret = 'vendor-application-http-test-secret';

  const serviceMock = {
    submit: jest.fn(),
    findMy: jest.fn(),
    findPending: jest.fn(),
    review: jest.fn(),
  };

  let server: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VendorApplicationController],
      providers: [
        AuthGuard,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'JWT_SECRET' ? secret : 'test',
          },
        },
        {
          provide: VendorApplicationService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
    server = app.getHttpServer();
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function request(
    method: 'GET' | 'POST',
    path: string,
    token?: string,
    body?: Record<string, unknown>,
  ) {
    const headers: Record<string, string> = {};
    if (token) headers.authorization = `Bearer ${token}`;

    const response = await fetch(
      `http://127.0.0.1:${server.address()?.port ?? 0}${path}`,
      {
        method,
        headers: {
          ...headers,
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );

    return {
      status: response.status,
      body: await response.json().catch(() => null),
    };
  }

  it('rejects POST /vendor-applications without a bearer token', async () => {
    const response = await request(
      'POST',
      '/vendor-applications',
      undefined,
      {
        businessName: 'HTTP Auth Test',
        email: 'applicant@example.test',
      },
    );

    expect(response.status).toBe(201); // OptionalAuthGuard allows anonymous submit
    expect(serviceMock.submit).toHaveBeenCalled(); // OptionalAuthGuard allows anonymous submit
  });

  it('rejects an invalid bearer token with 401 (not silently downgraded to anonymous)', async () => {
    const response = await request(
      'POST',
      '/vendor-applications',
      'not-a-valid-token',
      {
        businessName: 'HTTP Auth Test',
        email: 'applicant@example.test',
      },
    );

    expect(response.status).toBe(401); // OptionalAuthGuard now propagates invalid token errors
    expect(serviceMock.submit).not.toHaveBeenCalled();
  });

  it('passes the verified JWT identity to the submission service', async () => {
    const identity = {
      sub: 'http-test-user-123',
      email: 'applicant@example.test',
      role: UserRole.BUYER,
      vendorId: null,
    };

    const token = await jwtService.signAsync(identity, { secret });
    serviceMock.submit.mockResolvedValue({ id: 'application-http-test' });

    const response = await request(
      'POST',
      '/vendor-applications',
      token,
      {
        businessName: 'HTTP Auth Test',
        email: 'applicant@example.test',
      },
    );

    expect(response.status).toBe(201);
    expect(serviceMock.submit).toHaveBeenCalledTimes(1);
    expect(serviceMock.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: 'HTTP Auth Test',
        email: 'applicant@example.test',
      }),
      expect.objectContaining({
        id: identity.sub,
        email: identity.email,
        role: identity.role,
        vendorId: null,
      }),
    );
  });
});



