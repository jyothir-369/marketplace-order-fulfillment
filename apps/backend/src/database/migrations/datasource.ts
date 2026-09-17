import { DataSource } from 'typeorm';
import { Baseline0000000000000 } from './0000000000000-Baseline';
import { AddShippingAddressToOrders1710000000001 } from './1710000000001-AddShippingAddressToOrders';
import { BackfillShippingAddress1710000000002 } from './1710000000002-BackfillShippingAddress';
import { AddOrderNumber1710000000003 } from './1710000000003-AddOrderNumber';
import { AddUsersAndRefreshTokens1710000000004 } from './1710000000004-AddUsersAndRefreshTokens';
import { CategoriesAndCatalogContract1710000000005 } from './1710000000005-CategoriesAndCatalogContract';
import { AddMissingForeignKeysAndIndexes1710000000006 } from './1710000000006-AddMissingForeignKeysAndIndexes';
import { AddProductDescriptionAndImages1710000000007 } from './1710000000007-AddProductDescriptionAndImages';
import { AddOrderNumberSequence1710000000008 } from './1710000000008-AddOrderNumberSequence';
import { AddPaymentAuthorizations1710000000009 } from './1710000000009-AddPaymentAuthorizations';

export const migrationDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'marketplace',
  entities: [],
  migrations: [
    Baseline0000000000000,
    AddShippingAddressToOrders1710000000001,
    BackfillShippingAddress1710000000002,
    AddOrderNumber1710000000003,
    AddUsersAndRefreshTokens1710000000004,
    CategoriesAndCatalogContract1710000000005,
    AddMissingForeignKeysAndIndexes1710000000006,
    AddProductDescriptionAndImages1710000000007,
    AddOrderNumberSequence1710000000008,
    AddPaymentAuthorizations1710000000009,
  ],
  synchronize: false,
  logging: true,
});
