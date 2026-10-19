import { migrationDataSource } from './datasource';
import { MIGRATION_REGISTRY } from './registry';

async function runMigrations() {
  console.log('Starting migration runner (guarded, forward-only)...');
  // Datasource guard (assertFailClosedDatabase) executes before initialization
  try {
    await migrationDataSource.initialize();
    console.log('Data source initialized');
    const command = process.argv[2] || 'up';

    if (command === 'up') {
      console.log('Running pending migrations (authoritative registry)...');
      await migrationDataSource.runMigrations();
      console.log('Migrations completed successfully');
    } else if (command === 'status') {
      const status = await migrationDataSource.showMigrations();
      console.log('Migration status:', status);
    } else if (command === 'down') {
      console.log('BLOCKED: rollback/revert disabled (fail-closed)');
      await migrationDataSource.destroy();
      process.exit(0);
    } else if (command === 'revert') {
      console.error('BLOCKED: direct .down() / revert disabled (fail-closed)');
      await migrationDataSource.destroy();
      process.exit(1);
    }

    await migrationDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await migrationDataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

runMigrations();
