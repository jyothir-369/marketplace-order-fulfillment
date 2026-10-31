import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorPaymentAccountsService } from './vendor-payment-accounts.service';
import { VendorPaymentAccount } from '../../common/entities/vendor-payment-account.entity';

describe('VendorPaymentAccountsService', () => {
  let svc: VendorPaymentAccountsService;
  let repo: Repository<VendorPaymentAccount>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorPaymentAccountsService,
        { provide: getRepositoryToken(VendorPaymentAccount), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() } },
      ],
    }).compile();
    svc = module.get(VendorPaymentAccountsService);
    repo = module.get(getRepositoryToken(VendorPaymentAccount));
  });

  it('should refuse link without inputs (fail-closed)', async () => {
    await expect(svc.link({ vendorId: '', linkedAccountId: '' }, 'a', true)).rejects.toThrow();
  });
  it('should block activation without admin', async () => {
    await expect(svc.activate('id', 'a', false)).rejects.toThrow();
  });
  it('should return false eligible when no account', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    expect(await svc.isEligibleForTransfer('v1')).toBe(false);
  });
  it('should return true eligible when ACTIVE + linkedAccountId', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({ onboardingState: 'ACTIVE', linkedAccountId: 'lc1', vendorId: 'v1' });
    expect(await svc.isEligibleForTransfer('v1')).toBe(true);
  });
  it('should block transfer when SUSPENDED', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({ onboardingState: 'SUSPENDED', linkedAccountId: 'lc1', vendorId: 'v1' });
    expect(await svc.isEligibleForTransfer('v1')).toBe(false);
  });
});
