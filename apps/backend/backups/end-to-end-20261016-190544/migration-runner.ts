const command = process.argv[2] || 'status';

if (command !== 'status') {
  console.error(
    'BLOCKED: migration execution and other commands are disabled. Only status is permitted.',
  );
  process.exit(2);
}

async function runMigrations(): Promise<void> {
  // The datasource is loaded only for the explicitly permitted status command.
  const { migrationDataSource } = await import('./datasource');

  try {
    await migrationDataSource.initialize();
    const pending = await migrationDataSource.showMigrations();
    console.log('Pending migrations:', pending);
  } catch (error) {
    console.error('Migration status failed:', error);
    process.exitCode = 1;
  } finally {
    if (migrationDataSource.isInitialized) {
      await migrationDataSource.destroy();
    }
  }
}

void runMigrations();
