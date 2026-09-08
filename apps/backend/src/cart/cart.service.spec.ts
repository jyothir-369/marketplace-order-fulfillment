import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../common/entities/product.entity';
import { ConflictException } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartStore } from './cart-store';
import { InventoryService } from '../inventory/inventory.service';

describe('CartService', () => {
  let service: CartService;
  let cartStore: any;
  let inventoryService: any;

  const productRepositoryMock = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    cartStore = {
      get: jest.fn().mockResolvedValue([]),
      set: jest.fn().mockImplementation((_id, items) => Promise.resolve(items)),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    inventoryService = {
      validateStockAvailability: jest.fn().mockResolvedValue({
        available: true,
        items: [
          { productId: 'p1', productName: 'Widget', requestedQuantity: 1, availableQuantity: 10 },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Product), useValue: productRepositoryMock },
        { provide: CartStore, useValue: cartStore },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws 409 Conflict on upsert when inventory is insufficient', async () => {
    inventoryService.validateStockAvailability.mockResolvedValue({
      available: false,
      items: [
        { productId: 'p1', productName: 'Widget', requestedQuantity: 5, availableQuantity: 2 },
      ],
    });
    productRepositoryMock.find.mockResolvedValue([
      { id: 'p1', name: 'Widget', price: 10, vendor: { name: 'Acme' } },
    ]);

    await expect(
      service.upsertCart(
        {
          buyerId: 'b1',
          items: [
            { productId: 'p1', name: 'Widget', vendorId: 'v1', vendorName: 'Acme', quantity: 5, unitPrice: 10, maxStock: 10 },
          ],
        },
        'corr-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns enriched cart response on successful upsert', async () => {
    inventoryService.validateStockAvailability.mockResolvedValue({
      available: true,
      items: [
        { productId: 'p1', productName: 'Widget', requestedQuantity: 2, availableQuantity: 10 },
      ],
    });
    productRepositoryMock.find.mockResolvedValue([
      { id: 'p1', name: 'Widget', price: 12, vendor: { name: 'Acme' } },
    ]);

    const res = await service.upsertCart(
      {
        buyerId: 'b1',
        items: [
          { productId: 'p1', name: 'Widget', vendorId: 'v1', vendorName: 'Acme', quantity: 2, unitPrice: 10, maxStock: 10 },
        ],
      },
      'corr-1',
    );

    expect(res.itemCount).toBe(2);
    expect(res.subtotal).toBe(24);
    expect(res.items[0].unitPrice).toBe(12);
  });

  it('returns a conflict list from validateCart on oversell', async () => {
    inventoryService.validateStockAvailability.mockResolvedValue({
      available: false,
      items: [
        { productId: 'p1', productName: 'Widget', requestedQuantity: 8, availableQuantity: 2 },
      ],
    });

    await expect(
      service.validateCart(
        {
          buyerId: 'b1',
          items: [
            { productId: 'p1', name: 'Widget', vendorId: 'v1', vendorName: 'Acme', quantity: 8, unitPrice: 10, maxStock: 10 },
          ],
        },
        'corr-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('clears the session cart', async () => {
    await expect(service.clearCart('b1', 'corr-1')).resolves.toEqual({
      success: true,
    });
    expect(cartStore.delete).toHaveBeenCalledWith('b1');
  });
});
