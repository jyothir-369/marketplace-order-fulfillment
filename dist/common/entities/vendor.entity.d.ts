import { Product } from './product.entity';
import { OrderLineItem } from './order-line-item.entity';
export declare class Vendor {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    products: Product[];
    orderLineItems: OrderLineItem[];
}
