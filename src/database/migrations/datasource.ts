import { DataSource } from 'typeorm';
import { AddShippingAddressToOrders1710000000001 } from './1710000000001-AddShippingAddressToOrders';
import { BackfillShippingAddress1710000000002 } from './1710000000002-BackfillShippingAddress';
import { Vendor, Product, Order, OrderLineItem, VendorSyncJob } from '../../common/entities';
import { AuditLog } from '../../common/audit';

export const migrationDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'marketplace',
  entities: [Vendor, Product, Order, OrderLineItem, VendorSyncJob, AuditLog],
  migrations: [
    AddShippingAddressToOrders1710000000001,
    BackfillShippingAddress1710000000002,
  ],
  synchronize: false,
  logging: true,
});
