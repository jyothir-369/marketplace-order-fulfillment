import { DataSource } from 'typeorm';
import { AddShippingAddressToOrders1710000000001 } from './1710000000001-AddShippingAddressToOrders';
import { BackfillShippingAddress1710000000002 } from './1710000000002-BackfillShippingAddress';
import { AddOrderNumber1710000000003 } from './1710000000003-AddOrderNumber';
import { AddUsersAndRefreshTokens1710000000004 } from './1710000000004-AddUsersAndRefreshTokens';
import { CategoriesAndCatalogContract1710000000005 } from './1710000000005-CategoriesAndCatalogContract';

export const migrationDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'marketplace',
  entities: [],
  migrations: [
    AddShippingAddressToOrders1710000000001,
    BackfillShippingAddress1710000000002,
    AddOrderNumber1710000000003,
    AddUsersAndRefreshTokens1710000000004,
    CategoriesAndCatalogContract1710000000005,
  ],
  synchronize: false,
  logging: true,
});
