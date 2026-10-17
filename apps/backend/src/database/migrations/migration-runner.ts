const VALID_COMMANDS = ['status', 'up'];
const ROLLBACK_COMMANDS = ['down', 'revert'];
const command = process.argv[2] || 'status';

// Keep status as the safe default; allow explicitly requested 'up' after validation.
// Rollback remains disabled unless separately approved.
if (command === 'up') {
  // Explicit up permitted after deployed audit confirms 15 applied + 4 pending.
  // Guard remains in data-source initialization (assertFailClosedDatabase).
} else if (command === 'status') {
  // Safe default — show pending/applied.
} else if (ROLLBACK_COMMANDS.includes(command)) {
  console.error('BLOCKED: rollback disabled unless separately approved.');
  process.exit(2);
} else if (!VALID_COMMANDS.includes(command)) {
  console.error(`BLOCKED: unknown command "${command}". Use status or up.`);
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
    if (command === 'up') {
      // Explicit up permitted after deployed audit confirms 15 applied + 4 pending.
      // All duplicate timestamp identities preserved (CategoriesAndCatalogContract already applied).
      await migrationDataSource.runMigrations({ transaction: 'each' });
      console.log('Migration up completed');
      return;
    }
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
