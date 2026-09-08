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

  async decrementStock(
    dto: DecrementStockDto,
    correlationId: string,
    orderId?: string,
  ): Promise<StockOperationResult> {
    this.logger.log(
      'Decrementing stock for product ' + dto.productId + ' by ' + dto.quantity,
      InventoryService.name,
      correlationId,
    );

    return this.dataSource.transaction(async (manager) => {
      // Primary guard: pessimistic write lock (SELECT ... FOR UPDATE)
      const product = await manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: dto.productId })
        .getOne();

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
        this.logger.warn(
          'Insufficient stock for product ' +
            dto.productId +
            ': requested ' +
            dto.quantity +
            ', available ' +
            product.stockCount,
          InventoryService.name,
          correlationId,
        );
        return {
          success: false,
          productId: dto.productId,
          previousStock: product.stockCount,
          newStock: product.stockCount,
          requestedQuantity: dto.quantity,
          message:
            'Insufficient stock: requested ' +
            dto.quantity +
            ', available ' +
            product.stockCount,
        };
      }

      const previousStock = product.stockCount;
      const newStock = previousStock - dto.quantity;
      const previousVersion = product.version;

      // Secondary guard: include version in the UPDATE WHERE clause.
      // If another transaction modified the row in a way that bypassed the
      // pessimistic lock (e.g. direct UPDATE via admin tooling), this WHERE
      // will match 0 rows and we throw a concurrency error.
      const updateResult = await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stockCount: newStock })
        .where('id = :id AND version = :version', {
          id: dto.productId,
          version: previousVersion,
        })
        .execute();

      if ((updateResult.affected ?? 0) === 0) {
        throw new BadRequestException(
          `Optimistic lock failed for product ${dto.productId}: ` +
            `expected version ${previousVersion} but row was modified concurrently`,
        );
      }

      this.logger.log(
        'Stock decremented for product ' +
          dto.productId +
          ': ' +
          previousStock +
          ' -> ' +
          newStock +
          ' (v' +
          previousVersion +
          ')',
        InventoryService.name,
        correlationId,
      );

      await this.auditService.logInventoryDecrement(
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
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new BadRequestException('Product ' + productId + ' not found');
    }
    return {
      productId: product.id,
      currentStock: product.stockCount,
      isAvailable: product.isActive && product.stockCount > 0,
    };
  }

  async restoreStock(
    productId: string,
    quantity: number,
    correlationId: string,
    reason: string,
  ): Promise<StockOperationResult> {
    this.logger.log(
      'Restoring stock for product ' + productId + ' by ' + quantity,
      InventoryService.name,
      correlationId,
    );

    return this.dataSource.transaction(async (manager) => {
      const product = await manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne();

      if (!product) {
        throw new BadRequestException('Product ' + productId + ' not found');
      }

      const previousStock = product.stockCount;
      const newStock = previousStock + quantity;
      const previousVersion = product.version;

      // Secondary optimistic lock guard on restore
      const updateResult = await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stockCount: newStock })
        .where('id = :id AND version = :version', {
          id: productId,
          version: previousVersion,
        })
        .execute();

      if ((updateResult.affected ?? 0) === 0) {
        throw new BadRequestException(
          `Optimistic lock failed for product ${productId}: ` +
            `expected version ${previousVersion} but row was modified concurrently`,
        );
      }

      this.logger.log(
        'Stock restored for product ' +
          productId +
          ': ' +
          previousStock +
          ' -> ' +
          newStock +
          ' (v' +
          previousVersion +
          ')',
        InventoryService.name,
        correlationId,
      );

      await this.auditService.logInventoryRestore(
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
  }
}