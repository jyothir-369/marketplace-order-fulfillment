const command = process.argv[2] || 'status';
if (!['status', 'up'].includes(command)) {
  console.error('BLOCKED: only status and up are recognized; rollback/revert/down/revert/undo are disabled.');
  process.exit(2);
}

async function runMigrations(): Promise<void> {
  const { migrationDataSource } = await import('./datasource');
  try {
    await migrationDataSource.initialize();
    if (command === 'status') {
      const pending = await migrationDataSource.showMigrations();
      console.log('Pending migrations:', pending);
      return;
    }
    // Only 'up' permitted; blocked executions remain disabled by design until 1710000000005 resolved.
    console.error(
      'BLOCKED: migration execution disabled until 1710000000005 identity collision and deployed-history compatibility are resolved.',
    );
    process.exitCode = 3;
  } catch (error) {
    console.error('Migration status/check failed:', error);
    process.exitCode = 1;
  } finally {
    if (migrationDataSource.isInitialized) {
      await migrationDataSource.destroy();
    }
  }
}
void runMigrations();
