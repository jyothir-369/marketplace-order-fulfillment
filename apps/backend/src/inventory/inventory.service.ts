import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { DecrementStockDto, AdjustStockDto, StockOperationResult, StockInfoDto } from './dto/inventory.dto';
import { UserRole } from '../common/entities/user.entity';
import { AuthenticatedUser } from '../auth/auth.types';
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

  async adjustStock(
    productId: string,
    delta: number,
    reason: string,
    correlationId: string,
    manager?: EntityManager,
    caller?: AuthenticatedUser,
  ): Promise<StockOperationResult> {
    this.logger.log('Adjusting stock for product ' + productId + ' by delta ' + delta + ' | reason: ' + reason, InventoryService.name, correlationId);

    return this.runInTransaction(manager, async (m) => {
      const product = await (m as any).createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne();

      if (!product) {
        throw new BadRequestException('Product ' + productId + ' not found');
      }

      // Ownership enforcement: VENDOR may only adjust products of their own vendor.
      // Reject if caller.vendorId missing, product.vendorId missing, or IDs differ.
      // ADMIN (any non-VENDOR) bypasses the service-level vendor ownership check only;
      // endpoint access itself is restricted by the controller's AuthGuard/RolesGuard.
      // No caller means no enforcement (controller always passes user).
      if (caller && caller.role === UserRole.VENDOR) {
        if (!caller.vendorId) {
          throw new ForbiddenException('Vendor identity missing');
        }
        if (!product.vendorId) {
          throw new ForbiddenException('Product vendor association missing');
        }
        if (caller.vendorId !== product.vendorId) {
          throw new ForbiddenException('You do not have access to this product');
        }
      }

      if (!product.isActive) {
        return {
          success: false,
          productId,
          previousStock: product.stockCount,
          newStock: product.stockCount,
          requestedQuantity: Math.abs(delta),
          message: 'Product is not active',
        };
      }

      const previousStock = product.stockCount;
      const newStock = previousStock + delta;

      if (newStock < 0) {
        return {
          success: false,
          productId,
          previousStock,
          newStock: previousStock,
          requestedQuantity: Math.abs(delta),
          message: 'Insufficient stock for delta adjustment: would result in negative stock',
        };
      }

      await (m as any).createQueryBuilder()
        .update(Product)
        .set({ stockCount: newStock })
        .where('id = :id', { id: productId })
        .execute();

      // Reuse existing audit actions by sign; no new enum value required (decision A: reuse by sign).
      if (delta < 0) {
        await this.auditService.logInventoryDecrement(
          correlationId, productId, previousStock, newStock, Math.abs(delta), undefined,
        );
      } else if (delta > 0) {
        await this.auditService.logInventoryRestore(
          correlationId, productId, previousStock, newStock, delta, reason,
        );
      }

      return {
        success: true,
        productId,
        previousStock,
        newStock,
        requestedQuantity: Math.abs(delta),
      };
    });
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