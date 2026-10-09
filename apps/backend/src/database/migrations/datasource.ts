import { AddWebhookEventIdempotency1717000000000 } from './1717000000000-AddWebhookEventIdempotency';
import { DataSource } from 'typeorm';
import { Baseline1709999999999 } from './1709999999999-Baseline';
import { AddShippingAddressToOrders1710000000001 } from './1710000000001-AddShippingAddressToOrders';
import { BackfillShippingAddress1710000000002 } from './1710000000002-BackfillShippingAddress';
import { AddOrderNumber1710000000003 } from './1710000000003-AddOrderNumber';
import { AddUsersAndRefreshTokens1710000000004 } from './1710000000004-AddUsersAndRefreshTokens';
import { CategoriesAndCatalogContract1710000000005 } from './1710000000005-CategoriesAndCatalogContract';
import { AddMissingForeignKeysAndIndexes1710000000006 } from './1710000000006-AddMissingForeignKeysAndIndexes';
import { AddProductDescriptionAndImages1710000000007 } from './1710000000007-AddProductDescriptionAndImages';
import { AddOrderNumberSequence1710000000008 } from './1710000000008-AddOrderNumberSequence';
import { AddPaymentAuthorizations1710000000009 } from './1710000000009-AddPaymentAuthorizations';
import { BackfillProductCategory1710000000010 } from './1710000000010-BackfillProductCategory';
import { FixAuditEntityEnum1710000000011 } from './1710000000011-FixAuditEntityEnum';
import { AddReviewsTable1715000000000 } from './1715000000000-AddReviewsTable';
import { AddRazorpayPaymentSupport1716000000000 } from './1716000000000-AddRazorpayPaymentSupport';

const dbUrl = process.env.DATABASE_URL || '';
const isCloudDb =
  dbUrl.trim() !== '' &&
  (dbUrl.includes('supabase') ||
    dbUrl.includes('pooler') ||
    dbUrl.includes('sslmode=require') ||
    dbUrl.includes('.co'));

export const migrationDataSource = new DataSource({
  type: 'postgres',
  uuidExtension: 'pgcrypto',
  ...(dbUrl
    ? {
        url: dbUrl,
        ssl: isCloudDb ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'marketplace',
        ssl: false,
      }),
  entities: [],
  migrations: [
    Baseline1709999999999,
    AddShippingAddressToOrders1710000000001,
    BackfillShippingAddress1710000000002,
    AddOrderNumber1710000000003,
    AddUsersAndRefreshTokens1710000000004,
    CategoriesAndCatalogContract1710000000005,
    AddMissingForeignKeysAndIndexes1710000000006,
    AddProductDescriptionAndImages1710000000007,
    AddOrderNumberSequence1710000000008,
    AddPaymentAuthorizations1710000000009,
    BackfillProductCategory1710000000010,
    FixAuditEntityEnum1710000000011,
    AddReviewsTable1715000000000,
    AddRazorpayPaymentSupport1716000000000,
    AddWebhookEventIdempotency1717000000000,
  ],
  synchronize: false,
  logging: true,
});