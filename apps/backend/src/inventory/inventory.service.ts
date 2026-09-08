import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import {
  DecrementStockDto,
  StockOperationResult,
  StockInfoDto,
  StockCheckItemDto,
  StockAvailabilityItem,
  StockAvailabilityResult,
} from './dto/inventory.dto';
import { AuditService } from '../common/audit';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async decrementStock(dto: DecrementStockDto, correlationId: string, orderId?: string): Promise<StockOperationResult> {
    this.logger.log('Decrementing stock for product ' + dto.productId + ' by ' + dto.quantity, InventoryService.name, correlationId);

    var self = this;
    return this.dataSource.transaction(async function(manager) {
      return (manager as any).createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: dto.productId })
        .getOne()
        .then(async function(product) {
          if (!product) {
            throw new BadRequestException('Product ' + dto.productId + ' not found');
          }

          if (!product.isActive) {
            return {
              success: false,
              productId: dto.productId,
              previousStock: product.stockCount,
              newStock: product.stockCount,
              requestedQuantity: dto.quantity,
              message: 'Product is not active',
            };
          }

          if (product.stockCount < dto.quantity) {
            self.logger.warn('Insufficient stock for product ' + dto.productId + ': requested ' + dto.quantity + ', available ' + product.stockCount, InventoryService.name, correlationId);
            return {
              success: false,
              productId: dto.productId,
              previousStock: product.stockCount,
              newStock: product.stockCount,
              requestedQuantity: dto.quantity,
              message: 'Insufficient stock: requested ' + dto.quantity + ', available ' + product.stockCount,
            };
          }

          var previousStock = product.stockCount;
          var newStock = previousStock - dto.quantity;

          return (manager as any).createQueryBuilder()
            .update(Product)
            .set({ stockCount: newStock })
            .where('id = :id', { id: dto.productId })
            .execute()
            .then(async function() {
              self.logger.log('Stock decremented for product ' + dto.productId + ': ' + previousStock + ' -> ' + newStock, InventoryService.name, correlationId);
              
              await self.auditService.logInventoryDecrement(
                correlationId,
                dto.productId,
                previousStock,
                newStock,
                dto.quantity,
                orderId,
              );
              
              return {
                success: true,
                productId: dto.productId,
                previousStock: previousStock,
                newStock: newStock,
                requestedQuantity: dto.quantity,
              };
            });
        });
    });
  }

  /**
   * Batch availability guard used by cart/checkout endpoints.
   *
   * Acquires pessimistic write locks in sorted id order (same discipline as
   * checkout) so concurrent cart validations can never deadlock, then reports
   * per-item availability. This is deliberately non-mutating: reservations are
   * only applied at checkout time inside the checkout transaction.
   */
  async validateStockAvailability(
    items: StockCheckItemDto[],
    correlationId: string,
    manager?: EntityManager,
  ): Promise<StockAvailabilityResult> {
    const run = async (m: EntityManager): Promise<StockAvailabilityResult> => {
      const sortedIds = items.map((i) => i.productId).sort();
      const loaded = await m
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id IN (:...ids)', { ids: sortedIds })
        .getMany();

      const map = new Map<string, Product>();
      loaded.forEach((p) => map.set(p.id, p));

      const availability: StockAvailabilityItem[] = items.map((item) => {
        const product = map.get(item.productId);
        const availableQuantity = product?.isActive ? product.stockCount : 0;
        return {
          productId: item.productId,
          productName: product?.name ?? 'Unknown product',
          requestedQuantity: item.quantity,
          availableQuantity: Math.max(0, availableQuantity),
        };
      });

      const available = availability.every(
        (a) => a.availableQuantity >= a.requestedQuantity,
      );

      if (!available) {
        this.logger.warn(
          'Stock validation failed for ' +
            items.length +
            ' item(s); insufficient: ' +
            availability
              .filter((a) => a.availableQuantity < a.requestedQuantity)
              .map((a) => a.productId + ' (' + a.availableQuantity + '/' + a.requestedQuantity + ')')
              .join(', '),
          InventoryService.name,
          correlationId,
        );
      }

      return { available, items: availability };
    };

    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction(run);
  }

  async getStockInfo(productId: string): Promise<StockInfoDto> {
    var product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new BadRequestException('Product ' + productId + ' not found');
    }
    return {
      productId: product.id,
      currentStock: product.stockCount,
      isAvailable: product.isActive && product.stockCount > 0,
    };
  }

  async restoreStock(productId: string, quantity: number, correlationId: string, reason: string): Promise<StockOperationResult> {
    this.logger.log('Restoring stock for product ' + productId + ' by ' + quantity, InventoryService.name, correlationId);

    var self = this;
    return this.dataSource.transaction(async function(manager) {
      return (manager as any).createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne()
        .then(async function(product) {
          if (!product) {
            throw new BadRequestException('Product ' + productId + ' not found');
          }

          var previousStock = product.stockCount;
          var newStock = previousStock + quantity;

          return (manager as any).createQueryBuilder()
            .update(Product)
            .set({ stockCount: newStock })
            .where('id = :id', { id: productId })
            .execute()
            .then(async function() {
              self.logger.log('Stock restored for product ' + productId + ': ' + previousStock + ' -> ' + newStock, InventoryService.name, correlationId);
              
              await self.auditService.logInventoryRestore(
                correlationId,
                productId,
                previousStock,
                newStock,
                quantity,
                reason,
              );
              
              return {
                success: true,
                productId: productId,
                previousStock: previousStock,
                newStock: newStock,
                requestedQuantity: quantity,
              };
            });
        });
    });
  }
}