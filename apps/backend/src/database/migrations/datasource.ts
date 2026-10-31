import { AddFulfillmentOperationRecord1710000000005 } from './1710000000005-AddFulfillmentOperationRecord';
import { CustomerAddressesMigration2026101000000 } from './20261010-customer-addresses';
import { VendorLinkSafeguards2026101200000 } from './20261012-vendor-link-safeguards';
import { FixProductVendorIdColumn2026101400000 } from './20261014-FixProductVendorIdColumn';
import { AddBuyerIdempotencyKeyConstraint2026101500000 } from './20261015-AddBuyerIdempotencyKeyConstraint';
import { AddOAuthIdentityTable2026101500001 } from './20261015-AddOAuthIdentityTable';
import { AddPromotionsTable2026101700000 } from './20261017-AddPromotionsTable';
import { AddPasswordResetTokens2026101600000 } from './20261016-AddPasswordResetTokens';
import { AddWebhookEventIdempotency1717000000000 } from './1717000000000-AddWebhookEventIdempotency';
import { assertFailClosedDatabase } from '../../test/fail-closed-database-guard';
import { DataSource } from 'typeorm';
import { MIGRATION_CLASSES } from './migration-classes';
export { MIGRATION_CLASSES };
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
import { AddVendorPaymentAccounts2026102700000 } from './20261027-AddVendorPaymentAccounts';

export function parseMigrationTestDbUrl(): { host: string; port: number; username: string; password: string; database: string; protocol: string; query: string; fragment: string } | never {
  const urlStr = process.env.MIGRATION_TEST_DATABASE_URL;
  if (!urlStr || urlStr.trim() === '') { throw new Error('FAIL-CLOSED: MIGRATION_TEST_DATABASE_URL missing or empty'); }
  try {
    const url = urlStr.trim();
    let parsed;
    try { parsed = new URL(url); } catch (e: any) { throw new Error('FAIL-CLOSED: malformed URL: ' + (e && e.message ? e.message : String(e))); }
    if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') { throw new Error('FAIL-CLOSED: protocol invalid'); }
    if (!['localhost','127.0.0.1'].includes(parsed.hostname)) { throw new Error('FAIL-CLOSED: host invalid'); }
    if (parsed.port !== '55439') { throw new Error('FAIL-CLOSED: port must be 55439'); }
    if (parsed.pathname === '/' || !parsed.pathname || parsed.pathname === '') { throw new Error('FAIL-CLOSED: database missing'); }
    const segments = parsed.pathname.slice(1).split('/');
    if (segments.length !== 1 || segments[0] !== 'marketplace_migration_test') { throw new Error('FAIL-CLOSED: database must be marketplace_migration_test'); }
    if (parsed.search && parsed.search !== '') { throw new Error('FAIL-CLOSED: query not allowed'); }
    if (parsed.hash && parsed.hash !== '') { throw new Error('FAIL-CLOSED: fragment not allowed'); }
    const username = parsed.username || '';
    const password = parsed.password || '';
    if (username === '') { throw new Error('FAIL-CLOSED: username missing'); }
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 55439,
      username: decodeURIComponent(username),
      password: decodeURIComponent(password),
      database: 'marketplace_migration_test',
      protocol: parsed.protocol,
      query: parsed.search || '',
      fragment: parsed.hash || '',
    };
  } catch (e) { throw e instanceof Error ? e : new Error('FAIL-CLOSED: invalid URL'); }
}

function getMigrationConfigFromDbFields(): never { throw new Error('FAIL-CLOSED: Fallback MIGRATION_TEST_DB_* fields disabled'); }

function resolveMigrationConfig(): { host: string; port: number; username: string; password: string; database: string; protocol: string; query: string; fragment: string } {
  return parseMigrationTestDbUrl();
}

function createMigrationDataSource(): DataSource {
  if (process.env.DATABASE_URL || process.env.DB_HOST || process.env.DB_PORT ||
      process.env.DB_DATABASE || process.env.DB_USERNAME || process.env.DB_PASSWORD) {
    throw new Error(
      'BLOCKED: generic database overrides are forbidden for the migration test runner; use only the dedicated local test configuration',
    );
  }

const migrationConfig = resolveMigrationConfig();

  assertFailClosedDatabase({
    host: migrationConfig.host,
    port: migrationConfig.port,
    database: migrationConfig.database,
    url: '',
  });
  return new DataSource({
    type: 'postgres',
    host: migrationConfig.host,
    port: migrationConfig.port,
    username: migrationConfig.username,
    password: migrationConfig.password,
    database: migrationConfig.database,
    ssl: false,
    uuidExtension: 'pgcrypto',
    entities: [],
    migrations: MIGRATION_CLASSES,
    synchronize: false,
    logging: true,
  });
}

// Compatibility: no eager DataSource at import time.
// Callers that previously used `migrationDataSource` directly must now call `createMigrationDataSource()`.
// If a compatibility object is required, it must be obtained via the factory (lazy initialization), not at module scope.
export function getMigrationDataSourceLazy(): DataSource {
  return createMigrationDataSource();
}
