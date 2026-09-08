import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../../../../../.env') });
import { DataSource } from 'typeorm';
import { AddShippingAddressToOrders1710000000001 } from './1710000000001-AddShippingAddressToOrders';
import { BackfillShippingAddress1710000000002 } from './1710000000002-BackfillShippingAddress';

function parsePostgresUrl(url: string): {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    ssl: !parsed.searchParams.get('sslmode')?.includes('disable'),
  };
}

const databaseUrl = process.env.DATABASE_URL;
const parsedUrl = databaseUrl ? parsePostgresUrl(databaseUrl) : null;

export const migrationDataSource = new DataSource({
  type: 'postgres',
<<<<<<< HEAD
  host: parsedUrl?.host ?? (process.env.DB_HOST || 'localhost'),
  port: parsedUrl?.port ?? Number(process.env.DB_PORT || 5432),
  username: parsedUrl?.username ?? (process.env.DB_USERNAME || 'postgres'),
  password: parsedUrl?.password ?? (process.env.DB_PASSWORD || 'postgres'),
  database: parsedUrl?.database ?? (process.env.DB_DATABASE || 'marketplace'),
  ssl: parsedUrl ? (parsedUrl.ssl ? { rejectUnauthorized: false } : false) : undefined,
  entities: [Vendor, Product, Order, OrderLineItem, VendorSyncJob, AuditLog],
=======
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'marketplace',
  entities: [],
>>>>>>> origin/main
  migrations: [
    AddShippingAddressToOrders1710000000001,
    BackfillShippingAddress1710000000002,
  ],
  synchronize: false,
  logging: true,
});
