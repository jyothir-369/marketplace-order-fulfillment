import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { VendorApplication, VendorApplicationStatus } from './vendor-application.entity';
import { VendorApplicationService } from './vendor-application.service';
import { User, UserRole } from '../common/entities/user.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { DataSource } from 'typeorm';

describe('VendorApplicationService', () => {
  let service: VendorApplicationService;
  let appRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    appRepo = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue({
        id: 'v-app-1',
        status: VendorApplicationStatus.PENDING,
      }),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    };

    userRepo = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn().mockResolvedValue({
        id: 'u-1',
        email: 'seller@example.com',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorApplicationService,
        { provide: getRepositoryToken(VendorApplication), useValue: appRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(Vendor),
          useValue: {
            create: jest.fn(),
            save: jest.fn().mockResolvedValue({ id: 'v-1', name: 'Business' }),
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: (cb: any) =>
              cb({
                getRepository: (entity: any) => ({
                  findOne: jest.fn().mockResolvedValue(
                    entity === VendorApplication
                      ? {
                          id: 'v-app-1',
                          status: VendorApplicationStatus.PENDING,
                          applicantUserId: 'u-1',
                          businessName: 'B',
                          email: 'seller@example.com',
                        }
                      : { id: 'u-1', email: 'seller@example.com' },
                  ),
                  update: jest.fn(),
                }),
              }),
          },
        },
      ],
    }).compile();

    service = module.get<VendorApplicationService>(VendorApplicationService);
  });

  describe('submit identity checks', () => {
    const dto = {
      email: 'seller@example.com',
      businessName: 'My Business',
      reason: 'I want to sell products',
    } as any;

    it('accepts an anonymous guest application as PENDING without an applicant user ID', async () => {
      const result = await service.submit(dto, undefined);

      expect(appRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'seller@example.com',
          businessName: 'My Business',
          status: VendorApplicationStatus.PENDING,
        }),
      );

      const createdApplication = appRepo.create.mock.results[0].value;
      expect(createdApplication).not.toHaveProperty('applicantUserId');

      expect(appRepo.save).toHaveBeenCalledTimes(1);
      expect(appRepo.save).toHaveBeenCalledWith(createdApplication);
      expect(result).toEqual(
        expect.objectContaining({
          id: 'v-app-1',
          status: VendorApplicationStatus.PENDING,
        }),
      );
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects an anonymous guest application when persistence reports a unique violation', async () => {
      appRepo.save.mockRejectedValueOnce({ code: '23505' });

      await expect(service.submit(dto, undefined)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(appRepo.save).toHaveBeenCalledTimes(1);
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects when the authenticated account cannot be found', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.submit(dto, { id: 'missing-user' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(appRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an email that does not match the authenticated account', async () => {
      await expect(
        service.submit({ ...dto, email: 'other@example.com' }, { id: 'u-1' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(appRepo.findOne).not.toHaveBeenCalled();
      expect(appRepo.save).not.toHaveBeenCalled();
    });

    it('normalizes the account email and saves the authenticated user ID', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 'u-1',
        email: ' Seller@Example.com ',
      });

      await service.submit({ ...dto, email: 'seller@example.com' }, { id: 'u-1' });

      expect(appRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'seller@example.com',
          applicantUserId: 'u-1',
          status: VendorApplicationStatus.PENDING,
          businessName: 'My Business',
        }),
      );
      expect(appRepo.save).toHaveBeenCalledTimes(1);
    });

    it('returns the existing pending application for the same applicant', async () => {
      const existing = {
        id: 'existing-app',
        applicantUserId: 'u-1',
        email: 'seller@example.com',
        status: VendorApplicationStatus.PENDING,
      };
      appRepo.findOne.mockResolvedValueOnce(existing);

      await expect(service.submit(dto, { id: 'u-1' })).resolves.toBe(existing);

      expect(appRepo.findOne).toHaveBeenCalledWith({
        where: {
          applicantUserId: 'u-1',
          email: 'seller@example.com',
          status: VendorApplicationStatus.PENDING,
        },
      });
      expect(appRepo.save).not.toHaveBeenCalled();
    });

    it('converts a database unique violation to ConflictException without fetching another application', async () => {
      appRepo.save.mockRejectedValueOnce({ code: '23505' });

      await expect(service.submit(dto, { id: 'u-1' })).rejects.toBeInstanceOf(ConflictException);

      expect(appRepo.findOne).toHaveBeenCalledTimes(1);
      expect(appRepo.findOne).toHaveBeenCalledWith({
        where: {
          applicantUserId: 'u-1',
          email: 'seller@example.com',
          status: VendorApplicationStatus.PENDING,
        },
      });
    });
  });

  it('blocks approval from non-ADMIN', async () => {
    await expect(
      service.review('x', { decision: 'approve' } as any, { role: UserRole.VENDOR, id: 'v-1' } as any),
    ).rejects.toThrow();
  });

  it('blocks self-approval (applicant === reviewer)', async () => {
    await expect(
      service.review('v-app-1', { decision: 'approve' } as any, { role: UserRole.ADMIN, id: 'u-1' } as any),
    ).rejects.toThrow();
  });

  it('allows ADMIN approval when applicant is different', async () => {
    const res = await service.review(
      'v-app-1',
      { decision: 'approve' } as any,
      { role: UserRole.ADMIN, id: 'admin-1' } as any,
    );
    expect(res).toBeDefined();
  });
});
describe('additional authorization and transaction tests', () => {
  it('rejects anonymous approval without mutating the application', async () => {
    const updateMock: any = jest.fn();
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        VendorApplicationService,
        { provide: getRepositoryToken(VendorApplication), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'anon-app', status: VendorApplicationStatus.PENDING, applicantUserId: null, businessName: 'AnonBiz', email: 'anon@test.com' }) } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: getRepositoryToken(Vendor), useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() } },
        { provide: DataSource, useValue: {
          transaction: async (cb: any) => {
            const repos = {
              VendorApplication: { findOne: jest.fn().mockResolvedValue({ id: 'anon-app', status: VendorApplicationStatus.PENDING, applicantUserId: null, businessName: 'AnonBiz', email: 'anon@test.com' }), update: updateMock, save: jest.fn() },
              User: { findOne: jest.fn().mockResolvedValue(null), update: jest.fn() },
              Vendor: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
            };
            await cb({ getRepository: (e: any) => repos[e.name] || repos[e] || repos['VendorApplication'] });
          }
        }},
      ],
    }).compile();
    const svc = testModule.get<VendorApplicationService>(VendorApplicationService);
    await expect(svc.review('anon-app', { decision: 'approve' } as any, { role: UserRole.ADMIN, id: 'admin-1' } as any)).rejects.toBeInstanceOf(ConflictException);
    // Anonymous approval must fail closed without changing the application.
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejection does not modify applicant vendor role or association', async () => {
    const userRepoMock = { findOne: jest.fn().mockResolvedValue({ id: 'u-1', email: 'test@example.com' }), update: jest.fn() };
    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        VendorApplicationService,
        { provide: getRepositoryToken(VendorApplication), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'app-1', status: VendorApplicationStatus.PENDING, applicantUserId: 'u-1', businessName: 'B', email: 'test@example.com' }), update: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: userRepoMock },
        { provide: getRepositoryToken(Vendor), useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn().mockResolvedValue({ id: 'v-1', name: 'B' }) } },
        { provide: DataSource, useValue: {
          transaction: async (cb: any) => {
            await cb({
              getRepository: (e: any) => ({
                findOne: jest.fn().mockResolvedValue({ id: 'app-1', status: VendorApplicationStatus.PENDING, applicantUserId: 'u-1', businessName: 'B', email: 'test@example.com' }),
                update: jest.fn(),
                save: jest.fn(),
              }),
            });
          }
        }},
      ],
    }).compile();
    const svc = testModule.get<VendorApplicationService>(VendorApplicationService);
    await svc.review('app-1', { decision: 'reject' } as any, { role: UserRole.ADMIN, id: 'admin-1' } as any);
    expect(userRepoMock.update).not.toHaveBeenCalled();
  });
});
