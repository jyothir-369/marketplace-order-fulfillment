// Pure metadata module — no database connection, no env parsing at import time.
import { MIGRATION_REGISTRY, DUPLICATE_TIMESTAMPS, DEPLOYED_AUDIT_NOTE } from './registry';
export { MIGRATION_REGISTRY, DUPLICATE_TIMESTAMPS, DEPLOYED_AUDIT_NOTE };

export function getMigrationClassName(entry: string): string | null {
  // Canonical naming convention: class name ends with 13-digit timestamp.
  // This helper uses the registry basename only; file content verification is separate.
  return null; // placeholder for static callers that verify file content directly
}
