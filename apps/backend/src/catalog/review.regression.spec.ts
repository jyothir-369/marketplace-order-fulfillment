import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CatalogService } from './catalog.service';
import { Review } from '../common/entities/review.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { Order } from '../common/entities/order.entity';
import { UserRole } from '../common/entities/user.entity';

describe('CatalogService — reviews (regression)', () => {
  let service: CatalogService;
  let reviewRepo: any;
  let lineItemRepo: any;
  let orderRepo: any;

  function buyerUser(id = 'user-buyer') {
    return { id, email: 'b@t.com', role: UserRole.BUYER, vendorId: null } as any;
  }

  beforeEach(async () => {
    reviewRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (r: any) => ({ ...r, id: 'rev-id' })),
      create: jest.fn().mockImplementation((d: any) => d),
    };
    const qbMock = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
    };
    lineItemRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
    };
    orderRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: getRepositoryToken(Review), useValue: reviewRepo },
        { provide: getRepositoryToken(OrderLineItem), useValue: lineItemRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        // Minimal stubs for other repos required by CatalogService constructor
        { provide: getRepositoryToken(require('../common/entities/product.entity').Product), useValue: { createQueryBuilder: () => ({ getManyAndCount: () => [[], 0] }) } },
        { provide: getRepositoryToken(require('../common/entities/vendor.entity').Vendor), useValue: {} },
        { provide: getRepositoryToken(require('../common/entities/category.entity').Category), useValue: {} },
      ],
    }).compile();

    service = module.get(CatalogService);
  });

  it('accepts rating 1-5', async () => {
    const result = await service.createReview({ productId: 'p1', rating: 3, comment: 'ok' }, buyerUser(), 'c1');
    expect(result).toBe('rev-id');
    expect(reviewRepo.save).toHaveBeenCalledWith(expect.objectContaining({ rating: 3 }));
  });

  it('rejects anonymous (no user id) — service requires AuthenticatedUser', async () => {
    await expect(service.createReview({ productId: 'p1', rating: 5 }, null as any, 'c1')).rejects.toThrow();
  });

  it('rejects duplicate review (unique constraint)', async () => {
    reviewRepo.findOne.mockResolvedValue({ id: 'existing', productId: 'p1', buyerId: 'user-buyer' });
    await expect(service.createReview({ productId: 'p1', rating: 5 }, buyerUser(), 'c1')).rejects.toThrow('already exists');
  });

  it('requires fulfilled order + fulfilled line item for eligibility', async () => {
    // The default beforeEach mock (getCount=1) simulates eligibility.
    await service.createReview({ productId: 'p1', rating: 4 }, buyerUser(), 'c1');
    expect(reviewRepo.save).toHaveBeenCalled();
  });

  it('blocks ineligible buyer (no fulfilled purchase)', async () => {
    const chain = {
      innerJoin: () => chain,
      where: () => chain,
      andWhere: () => chain,
      getCount: () => Promise.resolve(0),
    };
    lineItemRepo.createQueryBuilder.mockReturnValue(chain);
    await expect(service.createReview({ productId: 'p1', rating: 2 }, buyerUser(), 'c1')).rejects.toThrow('Eligible completed purchase required');
  });
});
