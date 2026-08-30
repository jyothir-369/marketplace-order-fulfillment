import { Repository, DataSource } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { DecrementStockDto, StockOperationResult, StockInfoDto } from './dto/inventory.dto';
export declare class InventoryService {
    private readonly productRepository;
    private readonly dataSource;
    private readonly logger;
    constructor(productRepository: Repository<Product>, dataSource: DataSource);
    decrementStock(dto: DecrementStockDto, correlationId: string): Promise<StockOperationResult>;
    getStockInfo(productId: string): Promise<StockInfoDto>;
    restoreStock(productId: string, quantity: number, correlationId: string): Promise<StockOperationResult>;
}
