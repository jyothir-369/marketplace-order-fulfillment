import { Repository, DataSource } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { DecrementStockDto, StockOperationResult, StockInfoDto } from './dto/inventory.dto';
import { AuditService } from '../common/audit';
export declare class InventoryService {
    private readonly productRepository;
    private readonly dataSource;
    private readonly auditService;
    private readonly logger;
    constructor(productRepository: Repository<Product>, dataSource: DataSource, auditService: AuditService);
    decrementStock(dto: DecrementStockDto, correlationId: string, orderId?: string): Promise<StockOperationResult>;
    getStockInfo(productId: string): Promise<StockInfoDto>;
    restoreStock(productId: string, quantity: number, correlationId: string, reason: string): Promise<StockOperationResult>;
}
