import { MIGRATION_REGISTRY } from './registry';
import * as fs from 'fs';
import * as path from 'path';

describe('Migration registry integrity', () => {
  it('contains unique registry entries', () => {
    expect(new Set(MIGRATION_REGISTRY).size).toBe(MIGRATION_REGISTRY.length);
  });

  it('has a corresponding migration file for every registry entry', () => {
    const missing = MIGRATION_REGISTRY.filter(name =>
      !fs.existsSync(path.join(__dirname, `${name}.ts`)),
    );
    expect(missing).toEqual([]);
  });

  it('uses valid, unique 13-digit TypeORM migration timestamps', () => {
    const timestampToNames = new Map<string, string[]>();
    const invalid: string[] = [];

    for (const name of MIGRATION_REGISTRY) {
      const file = path.join(__dirname, `${name}.ts`);

      if (!fs.existsSync(file)) {
        continue;
      }

      const source = fs.readFileSync(file, 'utf8');
      const classMatch = source.match(
        /export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/,
      );

      if (!classMatch) {
        invalid.push(`${name}: cannot identify exported MigrationInterface class`);
        continue;
      }

      const className = classMatch[1];
      const suffix = className.slice(-13);

      // TypeORM 0.3.31 parses the last 13 class-name characters as a timestamp.
      if (!/^\d{13}$/.test(suffix) || Number(suffix) <= 0) {
        invalid.push(`${name}: class ${className} must end in a valid 13-digit timestamp`);
        continue;
      }

      const names = timestampToNames.get(suffix) ?? [];
      names.push(`${name} (${className})`);
      timestampToNames.set(suffix, names);
    }

    const collisions = [...timestampToNames.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([timestamp, names]) => `${timestamp}: ${names.join(', ')}`);

    expect({
      invalid,
      collisions,
    }).toEqual({
      invalid: [],
      collisions: [],
    });
  });
});
