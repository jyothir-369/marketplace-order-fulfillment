import { OrdersService } from './orders.service';
import { CheckoutDto, CheckoutResponseDto, OrderResponseDto } from './dto/orders.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    checkout(dto: CheckoutDto, correlationId: string): Promise<CheckoutResponseDto>;
    getOrder(id: string, correlationId: string): Promise<OrderResponseDto>;
    getOrdersByBuyer(buyerId: string): Promise<OrderResponseDto[]>;
}
