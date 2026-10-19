import type { MigrationInterface } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { MIGRATION_REGISTRY } from './registry';

export function getMigrationIdentity(Migration: unknown): string {
  if (typeof Migration !== 'function') {
    throw new Error('Invalid migration constructor in canonical registry.');
  }

  const ctor = Migration as unknown as {
    new (): { name?: unknown };
    name?: unknown;
    prototype?: { up?: unknown };
  };

  const instance = new ctor();
  const instanceName =
    typeof instance.name === 'string' ? instance.name.trim() : '';
  const className =
    typeof ctor.name === 'string' ? ctor.name.trim() : '';
  const identity = instanceName || className;

  if (!identity) {
    throw new Error('Migration has no valid TypeORM identity.');
  }
  return identity;
}

export type CanonicalMigrationClass = new (...args: never[]) => MigrationInterface;
export function loadCanonicalMigrationClasses(): CanonicalMigrationClass[] {
  const result: unknown[] = [];
  const identities = new Set<string>();

  for (const entry of MIGRATION_REGISTRY) {
    const filePathCandidates = [
      path.join(__dirname, `${entry}.ts`),
      path.join(__dirname, `${entry}.js`),
    ];
    const filePath = filePathCandidates.find((candidate) =>
      fs.existsSync(candidate),
    );

    if (!filePath) {
      throw new Error(
        `Canonical migration file missing: ${entry}.ts or ${entry}.js`,
      );
    }

    let exportsFromFile: Record<string, unknown>;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
    exportsFromFile = require(filePath) as Record<string, unknown>;
    } catch (error) {
      throw new Error(`Cannot load migration ${entry}: ${String(error)}`);
    }

    const candidates = Object.values(exportsFromFile).filter((value) => {
      if (typeof value !== 'function') return false;
      const prototype = (
        value as unknown as { prototype?: { up?: unknown } }
      ).prototype;
      return typeof prototype?.up === 'function';
    });

    if (candidates.length !== 1) {
      throw new Error(
        `Expected exactly one migration class in ${entry}.ts; found ${candidates.length}.`,
      );
    }

    const Migration = candidates[0] as unknown;
    const identity = getMigrationIdentity(Migration);

    if (identities.has(identity)) {
      throw new Error(`Duplicate migration class identity: ${identity}`);
    }

    identities.add(identity);
    result.push(Migration);
  }

  if (result.length !== MIGRATION_REGISTRY.length) {
    throw new Error(
      `Migration registry mismatch: expected ${MIGRATION_REGISTRY.length}, loaded ${result.length}.`,
    );
  }
for (const candidate of result) {
    if (typeof candidate !== 'function') {
        throw new Error('Canonical migration export is not a class/function');
    }

    const prototype = (
        candidate as { prototype?: { up?: unknown; down?: unknown } }
    ).prototype;

    if (
        !prototype ||
        typeof prototype.up !== 'function' ||
        typeof prototype.down !== 'function'
    ) {
        throw new Error('Canonical migration export must implement up() and down()');
    }
}

return result as CanonicalMigrationClass[];
}