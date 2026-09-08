import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { CartStore } from './cart-store';
import {
  CartItemDto,
  UpsertCartDto,
  ValidateCartDto,
  CartResponseDto,
  CartItemResponseDto,
} from './dto/cart.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cartStore: CartStore,
    private readonly inventoryService: InventoryService,
  ) {}

  async getCart(buyerId: string, correlationId: string): Promise<CartResponseDto> {
    const items = await this.cartStore.get(buyerId);
    const enriched = await this.enrich(items, correlationId);
    return this.toResponse(buyerId, enriched.items);
  }

  async upsertCart(
    dto: UpsertCartDto,
    correlationId: string,
  ): Promise<CartResponseDto> {
    const normalized = dto.items
      .filter((i) => i.quantity > 0)
      .map((i) => ({ ...i, quantity: Math.min(i.quantity, Math.max(1, i.maxStock)) }));

    const saved = await this.cartStore.set(dto.buyerId, normalized);
    const enrichedResult = await this.enrich(saved, correlationId);

    // Inventory guard — 409 with machine-readable conflict ids (frontend rolls back + prompts).
    if (!enrichedResult.available) {
      const conflicting = enrichedResult.items
        .filter((i) => i.availableQuantity < i.requestedQuantity)
        .map((i) => i.productId);
      this.logger.warn(
        `Cart sync rejected for buyer ${dto.buyerId}: insufficient stock for ${conflicting.join(', ')}`,
        CartService.name,
        correlationId,
      );
      throw new ConflictException({
        statusCode: 409,
        message: 'One or more items exceed available inventory',
        error: 'Conflict',
        conflictingProductIds: conflicting,
      });
    }

    return this.toResponse(dto.buyerId, enrichedResult.items);
  }

  async validateCart(
    dto: ValidateCartDto,
    correlationId: string,
  ): Promise<CartResponseDto> {
    const availability = await this.inventoryService.validateStockAvailability(
      dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      correlationId,
    );

    if (!availability.available) {
      const conflicting = availability.items
        .filter((i) => i.availableQuantity < i.requestedQuantity)
        .map((i) => i.productId);
      throw new ConflictException({
        statusCode: 409,
        message: 'One or more items exceed available inventory',
        error: 'Conflict',
        conflictingProductIds: conflicting,
      });
    }

    const items = await this.enrich(dto.items, correlationId);
    const response = this.toResponse(dto.buyerId, items.items);
    response.validation = availability;
    return response;
  }

  async clearCart(buyerId: string, correlationId: string): Promise<{ success: boolean }> {
    await this.cartStore.delete(buyerId);
    this.logger.log(`Cart cleared for buyer ${buyerId}`, CartService.name, correlationId);
    return { success: true };
  }

  private async enrich(items: CartItemDto[], correlationId: string) {
    if (items.length === 0) return { items: [], available: true };

    const products = await this.productRepository.find({
      where: items.map((i) => ({ id: i.productId })),
    });
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    const availability = await this.inventoryService.validateStockAvailability(
      items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      correlationId,
    );
    const availabilityMap = new Map(
      availability.items.map((a) => [a.productId, a]),
    );

    const enriched = items.map((item) => {
      const product = productMap.get(item.productId);
      const avail = availabilityMap.get(item.productId);
      const availableQuantity = avail?.availableQuantity ?? item.maxStock ?? 0;
      return {
        ...item,
        name: product?.name ?? item.name,
        vendorName: product?.vendor?.name ?? item.vendorName,
        unitPrice: Number(product?.price ?? item.unitPrice ?? 0),
        maxStock: availableQuantity,
        availableQuantity,
        requestedQuantity: item.quantity,
      };
    });

    const available = enriched.every(
      (i) => i.availableQuantity >= i.quantity,
    );

    return { items: enriched, available };
  }

  private toResponse(
    buyerId: string,
    items: Array<CartItemDto & { unitPrice: number; availableQuantity: number; requestedQuantity: number }>,
  ): CartResponseDto {
    const responseItems: CartItemResponseDto[] = items.map((i) => ({
      productId: i.productId,
      name: i.name,
      vendorId: i.vendorId,
      vendorName: i.vendorName,
      imageUrl: i.imageUrl,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.quantity * i.unitPrice,
      maxStock: i.maxStock,
    }));
    return {
      buyerId,
      items: responseItems,
      itemCount: responseItems.reduce((s, i) => s + i.quantity, 0),
      subtotal: responseItems.reduce((s, i) => s + i.lineTotal, 0),
      updatedAt: new Date().toISOString(),
    };
  }
}
