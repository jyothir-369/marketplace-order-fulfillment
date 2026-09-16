import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { DecrementStockDto, StockOperationResult, StockInfoDto } from './dto/inventory.dto';
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

  /**
   * Run `fn` against the caller's transaction when one is passed in, otherwise
   * open a fresh one. Lets stock operations participate in an outer transaction
   * (Phase 1.6 — e.g. order cancellation rolls back atomically).
   */
  private async runInTransaction<T>(manager: EntityManager | undefined, fn: (m: EntityManager) => Promise<T>): Promise<T> {
    if (manager) {
      return fn(manager);
    }
    return this.dataSource.transaction(fn);
  }

  async decrementStock(
    dto: DecrementStockDto,
    correlationId: string,
    orderId?: string,
    manager?: EntityManager,
  ): Promise<StockOperationResult> {
    this.logger.log('Decrementing stock for product ' + dto.productId + ' by ' + dto.quantity, InventoryService.name, correlationId);

    return this.runInTransaction(manager, async (m) => {
      const product = await (m as any).createQueryBuilder(Product, 'product')
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
        this.logger.warn('Insufficient stock for product ' + dto.productId + ': requested ' + dto.quantity + ', available ' + product.stockCount, InventoryService.name, correlationId);
        return {
          success: false,
          productId: dto.productId,
          previousStock: product.stockCount,
          newStock: product.stockCount,
          requestedQuantity: dto.quantity,
          message: 'Insufficient stock: requested ' + dto.quantity + ', available ' + product.stockCount,
        };
      }

      const previousStock = product.stockCount;
      const newStock = previousStock - dto.quantity;

      await (m as any).createQueryBuilder()
        .update(Product)
        .set({ stockCount: newStock })
        .where('id = :id', { id: dto.productId })
        .execute();

      this.logger.log('Stock decremented for product ' + dto.productId + ': ' + previousStock + ' -> ' + newStock, InventoryService.name, correlationId);

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

  async restoreStock(
    productId: string,
    quantity: number,
    correlationId: string,
    reason: string,
    manager?: EntityManager,
  ): Promise<StockOperationResult> {
    this.logger.log('Restoring stock for product ' + productId + ' by ' + quantity, InventoryService.name, correlationId);

    return this.runInTransaction(manager, async (m) => {
      const product = await (m as any).createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne();

      if (!product) {
        throw new BadRequestException('Product ' + productId + ' not found');
      }

      const previousStock = product.stockCount;
      const newStock = previousStock + quantity;

      await (m as any).createQueryBuilder()
        .update(Product)
        .set({ stockCount: newStock })
        .where('id = :id', { id: productId })
        .execute();

      this.logger.log('Stock restored for product ' + productId + ': ' + previousStock + ' -> ' + newStock, InventoryService.name, correlationId);

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