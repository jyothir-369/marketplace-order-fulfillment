import { loadCanonicalMigrationClasses } from './canonical-migrations';

/**
 * TypeORM migration list.
 * The registry remains the sole authority for migration identity and order.
 */
export const MIGRATION_CLASSES = loadCanonicalMigrationClasses();
