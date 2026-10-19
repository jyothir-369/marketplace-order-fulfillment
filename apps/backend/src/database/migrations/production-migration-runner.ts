import * as fs from 'fs';
import * as path from 'path';
import type { DataSource } from 'typeorm';
import { getProductionMigrationDataSource } from './production-datasource';
import { getMigrationIdentity, type CanonicalMigrationClass } from './canonical-migrations';
import { MIGRATION_REGISTRY, DUPLICATE_TIMESTAMPS } from './registry';

type MigrationClass = unknown;

const command = process.argv[2] || 'status';
const allowedCommands = ['status', 'up'];
const rollbackCommands = ['down', 'revert'];

function getConfiguredMigrations(ds: DataSource): MigrationClass[] {
  const configured = ds.options.migrations;
  if (!Array.isArray(configured)) {
    throw new Error('BLOCKED: production datasource has no migration array.');
  }

  const migrations = configured.filter(
    (entry): entry is CanonicalMigrationClass => typeof entry === 'function',
  );

  if (migrations.length !== configured.length) {
    throw new Error('BLOCKED: production datasource contains non-class migration entries.');
  }

  return migrations;
}

function checkRegistry(ds: DataSource): { names: string[]; issues: string[] } {
  const issues: string[] = [];

  for (const entry of MIGRATION_REGISTRY) {
    if (!fs.existsSync(path.join(__dirname, `${entry}.ts`))) {
      issues.push(`MISSING_FILE:${entry}.ts`);
    }
  }

  if (new Set(MIGRATION_REGISTRY).size !== MIGRATION_REGISTRY.length) {
    issues.push('DUPLICATE_REGISTRY_FILE_ENTRIES');
  }

  const migrations = getConfiguredMigrations(ds);
  const names = migrations.map((Migration) => getMigrationIdentity(Migration));
  const duplicateNames = names.filter((name, i) => names.indexOf(name) !== i);

  if (migrations.length !== MIGRATION_REGISTRY.length) {
    issues.push(
      `COUNT_MISMATCH:registry=${MIGRATION_REGISTRY.length},datasource=${migrations.length}`,
    );
  }

  if (duplicateNames.length) {
    issues.push(`DUPLICATE_CLASS_IDENTITIES:${[...new Set(duplicateNames)].join(',')}`);
  }

  return { names, issues };
}

async function readAppliedNames(ds: DataSource): Promise<string[]> {
  const result = await ds.query(
    "SELECT to_regclass('public.migrations') AS table_name",
  );

  if (!result[0]?.table_name) {
    throw new Error(
      'BLOCKED: public.migrations does not exist; applied migration history cannot be established safely.',
    );
  }

  const rows: Array<{ name: string }> = await ds.query(
    'SELECT name FROM public.migrations ORDER BY id ASC',
  );

  return rows.map((row) => String(row.name));
}

async function runProductionRunner(): Promise<void> {
  // Block rollback commands unconditionally; keep status read-only (no confirmation needed) and up requires confirmation.
  if (rollbackCommands.includes(command)) {
    console.error('BLOCKED: rollback disabled unless separately approved.');
    process.exit(2);
    return;
  }

  if (!allowedCommands.includes(command)) {
    console.error(`BLOCKED: unsupported command "${command}". Use status or up.`);
    process.exitCode = 2;
    return;
  }

  // For up command: enforce confirmation explicitly before datasource initialization.
  if (command === 'up') {
    const confirmEnv = process.env.MIGRATION_CONFIRM_WRITE;
    if (!confirmEnv || confirmEnv.trim().toLowerCase() !== 'yes') {
      console.error('BLOCKED: MIGRATION_CONFIRM_WRITE=yes required before any migration write or datasource initialization.');
      process.exitCode = 2;
      return;
    }
  }

  let ds: DataSource | undefined;

  try {
    // Status is read-only and never requires write confirmation; datasource loads with requireConfirm=false.
    // Up requires both confirmation (checked above) and datasource load with requireConfirm=true.
    ds = getProductionMigrationDataSource(command === 'up');
    await ds.initialize();

    const registryCheck = checkRegistry(ds);

    if (registryCheck.issues.length) {
      console.error('BLOCKED: registry/datasource issues:', registryCheck.issues);
      process.exitCode = 2;
      return;
    }

    const appliedNames = await readAppliedNames(ds);
    const appliedSet = new Set(appliedNames);
    const registeredNames = registryCheck.names;
    const pendingNames = registeredNames.filter((name) => !appliedSet.has(name));
    const unregisteredAppliedNames = appliedNames.filter(
      (name) => !registeredNames.includes(name),
    );

    console.log('Migration status:', {
      appliedCount: appliedNames.length,
      appliedNames,
      pendingCount: pendingNames.length,
      pendingNames,
      unregisteredAppliedNames,
      registryLength: MIGRATION_REGISTRY.length,
      datasourceMigrationCount: registeredNames.length,
      documentedTimestampTies: DUPLICATE_TIMESTAMPS,
    });

    if (unregisteredAppliedNames.length) {
      console.error(
        'BLOCKED: production history includes migrations absent from the current registry.',
      );
      process.exitCode = 2;
      return;
    }

    if (command === 'status') return;

    if (!pendingNames.length) {
      console.log('No pending migrations.');
      return;
    }

    console.log('Applying verified registry-pending migrations in TypeORM order.');
    const executed = await ds.runMigrations({ transaction: 'each' });

    console.log(
      'Migrations executed:',
      executed.map((migration) => ({
        name: migration.name,
        timestamp: migration.timestamp,
      })),
    );

    // Verify actual recorded history after execution.
    const afterNames = await readAppliedNames(ds);
    const afterSet = new Set(afterNames);
    const stillPending = registeredNames.filter((name) => !afterSet.has(name));

    console.log('Post-run verification:', {
      appliedCount: afterNames.length,
      stillPending,
    });

    if (stillPending.length) {
      console.error('Migration run did not complete the registered migration set.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      command === 'status' ? 'Status check failed:' : 'Migration up failed:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    if (ds?.isInitialized) await ds.destroy();
  }
}

void runProductionRunner();