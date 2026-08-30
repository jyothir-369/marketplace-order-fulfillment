import { Repository } from 'typeorm';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { AdminResolveDto, AdminDashboardDto } from './dto/admin.dto';
import { OrdersService } from '../orders/orders.service';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
export declare class AdminService {
    private readonly orderRepository;
    private readonly lineItemRepository;
    private readonly syncJobRepository;
    private readonly ordersService;
    private readonly fulfillmentService;
    private readonly logger;
    constructor(orderRepository: Repository<Order>, lineItemRepository: Repository<OrderLineItem>, syncJobRepository: Repository<VendorSyncJob>, ordersService: OrdersService, fulfillmentService: FulfillmentService);
    getDashboard(correlationId: string): Promise<AdminDashboardDto>;
    resolveOrderLineItem(lineItemId: string, dto: AdminResolveDto, correlationId: string): Promise<void>;
    cancelOrder(orderId: string, correlationId: string): Promise<void>;
    getDeadLetterDetails(correlationId: string): Promise<VendorSyncJob[]>;
    retryDeadLetterJob(jobId: string, correlationId: string): Promise<void>;
}
