import { AddFulfillmentOperationRecord1710000000005 } from './1710000000005-AddFulfillmentOperationRecord';
import { CustomerAddressesMigration2026101000000 } from './20261010-customer-addresses';
import { VendorLinkSafeguards2026101200000 } from './20261012-vendor-link-safeguards';
import { FixProductVendorIdColumn2026101400000 } from './20261014-FixProductVendorIdColumn';
import { AddBuyerIdempotencyKeyConstraint2026101500000 } from './20261015-AddBuyerIdempotencyKeyConstraint';
import { AddOAuthIdentityTable2026101500001 } from './20261015-AddOAuthIdentityTable';
import { AddPromotionsTable2026101700000 } from './20261017-AddPromotionsTable';
import { AddPasswordResetTokens2026101600000 } from './20261016-AddPasswordResetTokens';
import { AddWebhookEventIdempotency1717000000000 } from './1717000000000-AddWebhookEventIdempotency';
import { assertFailClosedDatabase, assertFailClosedDatabaseFromUrl } from '../../test/fail-closed-database-guard';
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

function parseMigrationTestDbUrl(): { host: string; port: number; username: string; database: string } | null {
  const url = process.env.MIGRATION_TEST_DATABASE_URL;
  if (!url || url.trim() === '') return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return null;
    if (parsed.port !== '55439') return null;
    const dbName = parsed.pathname && parsed.pathname.startsWith('/')
      ? parsed.pathname.slice(1) : undefined;
    if (!dbName || dbName !== 'marketplace_migration_test') return null;
    const host = parsed.hostname;
    const port = Number(parsed.port);
    const username = parsed.username || 'reconcile_test';
    return { host, port, username, database: dbName };
  } catch {
    return null;
  }
}

function getMigrationConfigFromDbFields(): { host: string; port: number; username: string; database: string } {
  const host = process.env.MIGRATION_TEST_DB_HOST || '127.0.0.1';
  const port = Number(process.env.MIGRATION_TEST_DB_PORT || 55439);
  const username = process.env.MIGRATION_TEST_DB_USERNAME || 'reconcile_test';
  const database = process.env.MIGRATION_TEST_DB_NAME || 'marketplace_migration_test';

  // Validate against allowed values
  if (!['localhost', '127.0.0.1'].includes(host)) {
    throw new Error('BLOCKED: MIGRATION_TEST_DB_HOST must be a loopback host');
  }
  if (port !== 55439) {
    throw new Error('BLOCKED: MIGRATION_TEST_DB_PORT must be 55439');
  }
  if (database !== 'marketplace_migration_test') {
    throw new Error('BLOCKED: MIGRATION_TEST_DB_NAME must be marketplace_migration_test');
  }

  return { host, port, username, database };
}

function resolveMigrationConfig(): { host: string; port: number; username: string; database: string } {
  // First, try MIGRATION_TEST_DATABASE_URL (takes precedence if set and valid)
  const urlConfig = parseMigrationTestDbUrl();
  if (urlConfig) return urlConfig;

  // Fall back to MIGRATION_TEST_DB_* fields
  return getMigrationConfigFromDbFields();
}

const migrationConfig = resolveMigrationConfig();

if (process.env.DATABASE_URL || process.env.DB_HOST || process.env.DB_PORT ||
    process.env.DB_DATABASE || process.env.DB_USERNAME || process.env.DB_PASSWORD) {
  throw new Error(
    'BLOCKED: generic database overrides are forbidden for the migration test runner; use only the dedicated local test configuration',
  );
}

assertFailClosedDatabase({
  host: migrationConfig.host,
  port: migrationConfig.port,
  database: migrationConfig.database,
  url: '',
});

export const migrationDataSource = new DataSource({
  type: 'postgres',
  host: migrationConfig.host,
  port: migrationConfig.port,
  username: migrationConfig.username,
  database: migrationConfig.database,
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
    CustomerAddressesMigration2026101000000,
    VendorLinkSafeguards2026101200000,
    AddPartialUniquePendingApplicantIndex2026101300000,
    AddVendorUserConstraints2026101300000,
    FixProductVendorIdColumn2026101400000,
    AddBuyerIdempotencyKeyConstraint2026101500000,
    AddOAuthIdentityTable2026101500001,
    AddPasswordResetTokens2026101600000,
    AddPromotionsTable2026101700000,
  ],
  synchronize: false,
  logging: true,
});
