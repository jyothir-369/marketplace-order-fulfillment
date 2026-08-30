import { Repository, DataSource } from 'typeorm';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { CheckoutDto, CheckoutResponseDto, OrderResponseDto } from './dto/orders.dto';
import { InventoryService } from '../inventory/inventory.service';
export declare class OrdersService {
    private readonly orderRepository;
    private readonly lineItemRepository;
    private readonly productRepository;
    private readonly vendorRepository;
    private readonly dataSource;
    private readonly inventoryService;
    private readonly logger;
    constructor(orderRepository: Repository<Order>, lineItemRepository: Repository<OrderLineItem>, productRepository: Repository<Product>, vendorRepository: Repository<Vendor>, dataSource: DataSource, inventoryService: InventoryService);
    checkout(dto: CheckoutDto, correlationId: string): Promise<CheckoutResponseDto>;
    getOrderById(id: string, correlationId: string): Promise<OrderResponseDto>;
    getOrdersByBuyer(buyerId: string): Promise<OrderResponseDto[]>;
    cancelOrder(orderId: string, correlationId: string): Promise<OrderResponseDto>;
    private toOrderResponseDto;
    private toLineItemResponseDto;
}
