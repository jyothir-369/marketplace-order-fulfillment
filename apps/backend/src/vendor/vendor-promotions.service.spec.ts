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
