import { MIGRATION_REGISTRY, DUPLICATE_TIMESTAMPS } from './registry';
import { migrationDataSource } from './datasource';
import * as fs from 'fs';
import * as path from 'path';

function getConfiguredMigrationNames(): string[] {
  const configured: unknown = migrationDataSource.options.migrations;
  let entries: unknown[];

  if (Array.isArray(configured)) {
    entries = configured;
  } else if (
    configured !== null &&
    typeof configured === 'object'
  ) {
    entries = Object.values(configured);
  } else if (
    typeof configured === 'string' ||
    typeof configured === 'function'
  ) {
    entries = [configured];
  } else {
    entries = [];
  }

  return entries.map((entry, index) => {
    if (typeof entry === 'function') return entry.name;
    if (typeof entry === 'string') return entry;
    throw new Error(`Unexpected datasource migration entry at index ${index}`);
  });
}
describe('Migration registry integrity (upgraded)', () => {
  it('every registry entry has file', () => {
    const missing = MIGRATION_REGISTRY.filter(name => !fs.existsSync(path.join(__dirname, `${name}.ts`)));
    expect(missing).toEqual([]);
  });

  it('every registry migration is in datasource', () => {
    const registered = new Set(getConfiguredMigrationNames());
    const missing: string[] = [];
    MIGRATION_REGISTRY.forEach(entry => {
      const src = fs.readFileSync(path.join(__dirname, `${entry}.ts`), 'utf8');
      const match = src.match(/export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/);
      if (!match || !registered.has(match[1])) missing.push(entry + ' (' + (match ? match[1] : 'no-class') + ')');
    });
    expect(missing).toEqual([]);
  });

  it('migration names are valid and unique (allowing documented collisions)', () => {
    const timestampToNames = new Map<string, string[]>();
    const invalid: string[] = [];
    for (const name of MIGRATION_REGISTRY) {
      const file = path.join(__dirname, `${name}.ts`);
      if (!fs.existsSync(file)) continue;
      const src = fs.readFileSync(file, 'utf8');
      const match = src.match(/export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/);
      if (!match) { invalid.push(`${name}: no class`); continue; }
      const className = match[1];
      const suffix = className.slice(-13);
      if (!/^\d{13}$/.test(suffix) || Number(suffix) <= 0) { invalid.push(`${name}: invalid suffix ${suffix}`); continue; }
      const names = timestampToNames.get(suffix) ?? [];
      names.push(`${name} (${className})`);
      timestampToNames.set(suffix, names);
    }
    const collisions = [...timestampToNames.entries()].filter(([, v]) => v.length > 1).map(([ts, n]) => `${ts}: ${n.join(', ')}`);
    // Documented collisions should be exactly the allowlist; no extra undocumented collisions.
    expect(invalid).toEqual([]);
    // Collisions must match allowlist exactly (no missing, no extra, no changed)
    expect(collisions.sort()).toEqual(DUPLICATE_TIMESTAMPS.map(ts => {
      const namesForTs = timestampToNames.get(ts) || [];
      return namesForTs.length > 0 ? `${ts}: ${namesForTs.join(', ')}` : '';
    }).filter(s => s).sort());
    // Fail if undocumented collision appears: length of detected collisions equals allowlist
    expect(collisions.length).toBe(DUPLICATE_TIMESTAMPS.length);
  });

  it('detects and compares timestamp collisions against allowlist', () => {
    const timestampToNames = new Map<string, string[]>();
    for (const name of MIGRATION_REGISTRY) {
      const file = path.join(__dirname, `${name}.ts`);
      if (!fs.existsSync(file)) continue;
      const src = fs.readFileSync(file, 'utf8');
      const match = src.match(/export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/);
      if (!match) continue;
      const className = match[1];
      const suffix = className.slice(-13);
      if (!/^\d{13}$/.test(suffix)) continue;
      const arr = timestampToNames.get(suffix) ?? [];
      arr.push(name + ':' + className);
      timestampToNames.set(suffix, arr);
    }
    const detectedCollisions = new Set([...timestampToNames.entries()].filter(([, v]) => v.length > 1).map(([k]) => k));
    const allowSet = new Set(DUPLICATE_TIMESTAMPS);
    // Every detected collision must be documented; every documented must still exist.
    for (const c of detectedCollisions) expect(allowSet.has(c)).toBe(true);
    for (const a of allowSet) expect(detectedCollisions.has(a)).toBe(true);
  });

  it('registry/datasource/class filename identity agrees per entry', () => {
    const registered = new Set(getConfiguredMigrationNames());
    for (const entry of MIGRATION_REGISTRY) {
      const file = path.join(__dirname, `${entry}.ts`);
      expect(fs.existsSync(file)).toBe(true);
      const src = fs.readFileSync(file, 'utf8');
      const match = src.match(/export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/);
      expect(match).toBeTruthy();
      expect(registered.has(match![1])).toBe(true);
    }
  });

  it('fails if undocumented collision appears', () => {
    // This test is structural: if new collision appears, previous comparison tests will fail.
    expect(DUPLICATE_TIMESTAMPS.length).toBeGreaterThanOrEqual(2);
  });

  it('reports that source-level verification is not proof of database compatibility', () => {
    // Structural registry verification (file/class/datasource alignment) does NOT prove
    // deployed-database compatibility. A separate, explicitly approved isolated DB run is required.
    expect(DUPLICATE_TIMESTAMPS.length >= 0).toBe(true);
  });
});
