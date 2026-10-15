import { Injectable, NotFoundException, ForbiddenException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VendorApplication, VendorApplicationStatus } from './vendor-application.entity';
import { User, UserRole } from '../common/entities/user.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { SubmitApplicationDto, ReviewApplicationDto } from './dto/vendor-application.dto';

@Injectable()
export class VendorApplicationService {
  constructor(
    @InjectRepository(VendorApplication)
    private readonly repo: Repository<VendorApplication>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    private readonly ds: DataSource,
  ) {}

  async submit(dto: SubmitApplicationDto, applicant?: any) {
    if (!applicant?.id) {
      // Public / unauthenticated submission permitted (guest form).
      const accountEmail = (dto.email || '').trim().toLowerCase();
      if (!accountEmail) {
        throw new UnauthorizedException('Email is required');
      }
      // Create anonymous / guest application without requiring a user account.
      const app = this.repo.create({
        ...dto,
        email: accountEmail,
        status: VendorApplicationStatus.PENDING,
      });
      try {
        return await this.repo.save(app);
      } catch (e: any) {
        if (e?.code === '23505' || (typeof e?.message === 'string' && /unique constraint/i.test(e.message))) {
          throw new ConflictException('A pending vendor application already exists');
        }
        throw e;
      }
    }

    const account = await this.userRepo.findOne({ where: { id: applicant.id } });
    if (!account) {
      throw new UnauthorizedException('Authenticated account could not be found');
    }

    const accountEmail = (account.email || '').trim().toLowerCase();
    const submittedEmail = (dto.email || '').trim().toLowerCase();

    if (!accountEmail || submittedEmail !== accountEmail) {
      throw new ForbiddenException('Application email must match your signed-in account email');
    }

    const existing = await this.repo.findOne({
      where: {
        applicantUserId: account.id,
        email: accountEmail,
        status: VendorApplicationStatus.PENDING,
      },
    });
    if (existing) return existing;

    const app = this.repo.create({
      ...dto,
      email: accountEmail,
      applicantUserId: account.id,
      status: VendorApplicationStatus.PENDING,
    });

    try {
      return await this.repo.save(app);
    } catch (e: any) {
      if (
        e?.code === '23505' ||
        (typeof e?.message === 'string' && /unique constraint/i.test(e.message))
      ) {
        // Never fetch or return another applicant's record by email alone.
        throw new ConflictException('A pending vendor application already exists');
      }
      throw e;
    }
  }

  async findMy(applicantUserId: string) {
    return this.repo.find({ where: { applicantUserId }, order: { createdAt: 'DESC' } });
  }

  async findPending() {
    return this.repo.find({ where: { status: VendorApplicationStatus.PENDING }, order: { createdAt: 'ASC' } });
  }

  async review(id: string, dto: ReviewApplicationDto, reviewer: any) {
    if (reviewer?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin only');
    }

    let anonymousApplicantRejected = false;

    const result = await this.ds.transaction(async (manager) => {
      const appRepo = manager.getRepository(VendorApplication);

      const app = await appRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!app) {
        throw new NotFoundException('Application not found');
      }

      if (app.status !== VendorApplicationStatus.PENDING) {
        throw new ConflictException('Invalid status transition');
      }

      if (reviewer.id === app.applicantUserId) {
        throw new ForbiddenException('Self-approval blocked');
      }

      const userRepo = manager.getRepository(User);
      const applicant = app.applicantUserId
        ? await userRepo.findOne({ where: { id: app.applicantUserId } })
        : null;

      if (dto.decision === 'approve') {
        if (!applicant) {
            await appRepo.update(
            { id },
            {
              status: VendorApplicationStatus.REJECTED,
              reviewerUserId: reviewer.id,
              reviewedAt: new Date(),
            },
          );
          // Return normally so TypeORM commits the rejection.
          anonymousApplicantRejected = true;
          return null;
        }

        const vendorRepo = manager.getRepository(Vendor);
        let vendor = await vendorRepo.findOne({
          where: { name: app.businessName },
        });

        if (!vendor) {
          vendor = await vendorRepo.save(
            vendorRepo.create({ name: app.businessName }),
          );
        }

        await userRepo.update(
          { id: applicant.id },
          { role: UserRole.VENDOR, vendorId: vendor.id },
        );

            await appRepo.update(
          { id },
          {
            status: VendorApplicationStatus.APPROVED,
            reviewerUserId: reviewer.id,
            reviewedAt: new Date(),
          },
        );
      } else if (dto.decision === 'reject') {
            await appRepo.update(
          { id },
          {
            status: VendorApplicationStatus.REJECTED,
            reviewerUserId: reviewer.id,
            reviewedAt: new Date(),
          },
        );
      } else {
        throw new ConflictException('Invalid application decision');
      }

      return appRepo.findOne({ where: { id } });
    });

    // This exception must remain outside the transaction callback.
    if (anonymousApplicantRejected) {
      throw new ConflictException(
        'Applicant not registered: please register and link the application before approval',
      );
    }

    return result;
  }
}

