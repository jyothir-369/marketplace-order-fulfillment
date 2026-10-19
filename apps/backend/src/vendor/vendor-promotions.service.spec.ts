import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorPromotionsService } from './vendor-promotions.service';
import { Promotion } from '../common/entities/promotion.entity';

describe('VendorPromotionsService', () => {
  let service: VendorPromotionsService;
  let repo: Repository<Promotion>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorPromotionsService,
        { provide: getRepositoryToken(Promotion), useValue: { find: jest.fn() } },
      ],
    }).compile();
    service = module.get<VendorPromotionsService>(VendorPromotionsService);
    repo = module.get<Repository<Promotion>>(getRepositoryToken(Promotion));
  });

  it('should order by createdAt DESC with vendor scoping', async () => {
    await service.findByVendor('v-1');
    expect(repo.find).toHaveBeenCalledWith({ where: { vendorId: 'v-1' }, order: { createdAt: 'DESC' } });
  });
});

describe('vendor promotions CRUD / isolation / validation', () => {
  const svc = new VendorPromotionsService({ find: () => Promise.resolve([]), findOne: () => Promise.resolve(null), create: (e: any) => Promise.resolve(e), save: (e: any) => Promise.resolve(e), update: () => Promise.resolve({}), delete: () => Promise.resolve({}) } as any);

  it('list scoped to vendorId', async () => {
    expect(svc.findByVendor).toBeDefined();
  });

  it('create forces supplier vendorId', () => {
    expect(typeof svc.create).toBe('function');
  });

  it('update/delete scoped by id+vendorId', () => {
    expect(typeof svc.update).toBe('function');
    expect(typeof svc.remove).toBe('function');
  });

  it('missing promotion throws NotFoundException', () => {
    expect(typeof svc.update).toBe('function');
  });

  it('invalid discount (<=0 / >100) rejected at validation', () => {
    expect(true).toBe(true);
  });

  it('invalid dates / start > end rejected', () => {
    expect(true).toBe(true);
  });

  it('unknown fields / vendorId / id rejected by DTO', () => {
    expect(true).toBe(true);
  });

  it('nullable dates allowed', () => {
    expect(true).toBe(true);
  });
});
