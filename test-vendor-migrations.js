const { DataSource } = require('typeorm');
const { AddVendorApplicationTable1749624000000 } = require('./apps/backend/src/database/migrations/1749624000000-AddVendorApplicationTable');
const { AddPartialUniquePendingApplicantIndex2026101300000 } = require('./apps/backend/src/database/migrations/20261013-AddPartialUniquePendingApplicantIndex');

async function main() {
  // Use env password securely (not printed)
  const password = process.env.POSTGRES_PASSWORD || process.env.VENDOR_FIX_TEST_DB_PASSWORD || '';
  const ds = new DataSource({
    type: 'postgres',
    host: 'localhost', port: 55432,
    username: 'reconcile_test',
    password: password,
    database: 'marketplace_vendor_class_fix_test_20261013',
    entities: [],
    synchronize: false,
    logging: false,
    migrations: [AddVendorApplicationTable1749624000000, AddPartialUniquePendingApplicantIndex2026101300000],
    migrationsRun: false,
    migrationsTransactionMode: 'all',
    uuidExtension: 'pgcrypto',
  });
  await ds.initialize();
  console.log('DB:', ds.options.database, '| UUID ext: pgcrypto');
  
  // Run migrations explicitly (not full chain)
  const runner = ds.createQueryRunner();
  await runner.connect();
  
  console.log('Migration 1 (.up):', typeof new AddVendorApplicationTable1749624000000().up);
  await new AddVendorApplicationTable1749624000000().up(runner);
  console.log('Migration 1 EXECUTED OK');
  
  console.log('Migration 2 (.up):', typeof new AddPartialUniquePendingApplicantIndex2026101300000().up);
  await new AddPartialUniquePendingApplicantIndex2026101300000().up(runner);
  console.log('Migration 2 EXECUTED OK');
  
  await runner.release();
  await ds.destroy();
  console.log('Done. DB preserved. No commit/push/deploy.');
}
main().catch(e => { console.error('FAILED:', e.message || e); process.exit(1); });
