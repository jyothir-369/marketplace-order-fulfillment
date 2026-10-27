import { Test, TestingModule } from '@nestjs/testing';
import { TransferDurableService } from './transfer-durable.service';
import { TransferInstructionPersistenceService } from './transfer-instruction-persistence.service';
import { VendorPaymentAccountsService } from '../vendor/payment-accounts/vendor-payment-accounts.service';

describe('TransferDurableService', () => {
  let durable: TransferDurableService;
  let persistenceMock: Partial<TransferInstructionPersistenceService>;
  let accountServiceMock: Partial<VendorPaymentAccountsService>;

  beforeEach(async () => {
    persistenceMock = {
      createInstruction: jest.fn().mockResolvedValue({ id: 'TRX-TEST', state: 'PENDING' }),
    };
    accountServiceMock = {
      isEligibleForTransfer: jest.fn().mockResolvedValue(true),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferDurableService,
        { provide: TransferInstructionPersistenceService, useValue: persistenceMock },
        { provide: VendorPaymentAccountsService, useValue: accountServiceMock },
      ],
    }).compile();
    durable = module.get(TransferDurableService);
  });

  it('should block transfer when amount is negative (fail-closed)', async () => {
    const result = await durable.submitForEligibleAllocation('A1', 'V1', -100, 'INR', 'POL');
    expect(result.blocked).toBe(true);
  });

  it('should block when vendor is not eligible', async () => {
    (accountServiceMock.isEligibleForTransfer as jest.Mock).mockResolvedValue(false);
    const result = await durable.submitForEligibleAllocation('A2', 'V2', 100, 'INR', 'POL');
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('not eligible');
  });

  it('should return instruction when eligible', async () => {
    (accountServiceMock.isEligibleForTransfer as jest.Mock).mockResolvedValue(true);
    const result = await durable.submitForEligibleAllocation('A3', 'V3', 500, 'INR', 'POL');
    expect(result.blocked).toBeFalsy();
    expect(result.instructionId).toBeDefined();
    expect(result.instructionId).toContain('TRX-');
  });

  it('should treat eligibility exception as blocked (fail-closed)', async () => {
    (accountServiceMock.isEligibleForTransfer as jest.Mock).mockRejectedValue(new Error('DB'));
    const result = await durable.submitForEligibleAllocation('A4', 'V4', 100, 'INR', 'POL');
    expect(result.blocked).toBe(true);
  });
});
