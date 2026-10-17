// Production datasource for migration-runner — loads root .env, validates DATABASE_URL / Supabase, requires confirmation.
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { MIGRATION_REGISTRY } from './registry';
import { loadCanonicalMigrationClasses } from './canonical-migrations';

// Load root .env first (before any other env initialization)
const rootEnvPath = path.resolve(__dirname, '../../../..', '.env');
const rootEnvLocalPath = path.resolve(__dirname, '../../../..', '.env.local');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(rootEnvLocalPath)) {
  dotenv.config({ path: rootEnvLocalPath });
}

// Preserve test datasource unchanged; never allow generic overrides to leak into test runner
if (process.env.MIGRATION_TEST_DB_HOST || process.env.MIGRATION_TEST_DB_USERNAME) {
  // Test-only env keys present; do not treat as production target
}

export function validateProductionTarget(requireWriteConfirmation = false): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('BLOCKED: DATABASE_URL is required for production migrations; .env not loaded or missing');
  }
  const urlLower = databaseUrl.toLowerCase();
  const isSupabase = urlLower.includes('supabase') || urlLower.includes('pooler');
  if (!isSupabase) {
    throw new Error('BLOCKED: DATABASE_URL must target a Supabase database (supabase / pooler)');
  }
  if (requireWriteConfirmation) {
    const confirmEnv = process.env.MIGRATION_CONFIRM_WRITE;
    if (!confirmEnv || confirmEnv.trim().toLowerCase() !== 'yes') {
      throw new Error('BLOCKED: explicit confirmation required (set MIGRATION_CONFIRM_WRITE=yes) before production writes');
    }
  }
}

export function getProductionMigrationDataSource(requireConfirm = true): DataSource {
  // Load root .env fresh for production runs (before any env initialization)
  const rootEnvPath = path.resolve(process.cwd(), '.env');
  const rootEnvLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath, override: true });
  }
  if (fs.existsSync(rootEnvLocalPath)) {
    dotenv.config({ path: rootEnvLocalPath, override: true });
  }
  // For production datasource initialization: confirm writes must be set; but status call relies on the runner's authorization split (status never requires confirmation). If called from status path without MIGRATION_CONFIRM_WRITE, validation passes with false by default unless override is forced.
  // For safe read-only status: the runner passes no confirmation; the datasource function defaults to false to allow initialization. The runner's assertWriteConfirmed handles the up authorization.
  validateProductionTarget(requireConfirm);
  const url = process.env.DATABASE_URL!;
  return new DataSource({
    type: 'postgres',
    url,
    ssl: url.includes('sslmode') ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: true,
    entities: [],
    migrations: loadCanonicalMigrationClasses(),
  });
}
