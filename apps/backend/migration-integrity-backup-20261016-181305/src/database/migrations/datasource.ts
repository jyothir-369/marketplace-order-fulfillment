import { AddFulfillmentOperationRecord1710000000005 } from './1710000000005-AddFulfillmentOperationRecord';
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
import { AddVendorApplicationTable1749624000000 } from './1749624000000-AddVendorApplicationTable';
import { AddPartialUniquePendingApplicantIndex2026101300000 } from './20261013-AddPartialUniquePendingApplicantIndex';
import { AddVendorUserConstraints2026101300000 } from './20261013-AddVendorUserConstraints';

import { assertFailClosedDatabase } from '../../test/fail-closed-database-guard';

const migrationDb = {
  host: process.env.MIGRATION_TEST_DB_HOST || '127.0.0.1',
  port: Number(process.env.MIGRATION_TEST_DB_PORT || 55432),
  username: process.env.MIGRATION_TEST_DB_USERNAME || 'reconcile_test',
  database: process.env.MIGRATION_TEST_DB_NAME || 'marketplace_order_fulfillment_test',
};

if (process.env.DATABASE_URL || process.env.DB_HOST || process.env.DB_PORT ||
    process.env.DB_DATABASE || process.env.DB_USERNAME || process.env.DB_PASSWORD) {
  throw new Error(
    'BLOCKED: generic database overrides are forbidden for the migration test runner; use only the dedicated local test configuration',
  );
}

assertFailClosedDatabase({
  host: migrationDb.host,
  port: migrationDb.port,
  database: migrationDb.database,
  url: '',
});

export const migrationDataSource = new DataSource({
  type: 'postgres',
  host: migrationDb.host,
  port: migrationDb.port,
  username: migrationDb.username,
  database: migrationDb.database,
  password: process.env.MIGRATION_TEST_DB_PASSWORD || '',
  ssl: false,
  uuidExtension: 'pgcrypto',
  entities: [],
  migrations: [
    Baseline1709999999999,
    AddShippingAddressToOrders1710000000001,
    BackfillShippingAddress1710000000002,
    AddOrderNumber1710000000003,
    AddUsersAndRefreshTokens1710000000004,
    CategoriesAndCatalogContract1710000000005,
    AddFulfillmentOperationRecord1710000000005,
    AddMissingForeignKeysAndIndexes1710000000006,
    AddProductDescriptionAndImages1710000000007,
    AddOrderNumberSequence1710000000008,
    AddPaymentAuthorizations1710000000009,
    BackfillProductCategory1710000000010,
    FixAuditEntityEnum1710000000011,
    AddReviewsTable1715000000000,
    AddRazorpayPaymentSupport1716000000000,
    AddWebhookEventIdempotency1717000000000,
    AddVendorApplicationTable1749624000000,
    AddPartialUniquePendingApplicantIndex2026101300000,
    AddVendorUserConstraints2026101300000,
  ],
  synchronize: false,
  logging: true,
});

