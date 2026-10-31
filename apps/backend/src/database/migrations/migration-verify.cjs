'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const registryPath = path.join(root, 'registry.ts');
const datasourcePath = path.join(root, 'datasource.ts');

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Required file does not exist: ${file}`);
  }

  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function arrayBlock(source, name) {
  const startPattern = new RegExp(
    String.raw`(?:export\s+)?(?:const|let|var)\s+${name}\b[^=]*=\s*\[`,
    'm'
  );

  const start = startPattern.exec(source);

  if (!start) {
    throw new Error(`Cannot locate ${name} array.`);
  }

  const startIndex = start.index + start[0].length;
  let depth = 1;
  let quote = null;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];

    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '[') depth += 1;

    if (character === ']') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(startIndex, index);
      }
    }
  }

  throw new Error(`Cannot find closing bracket for ${name}.`);
}

function stringItems(block, name) {
  const values = [];
  const expression = /(['"])([^'"\\]*(?:\\.[^'"\\]*)*)\1/g;

  let match;

  while ((match = expression.exec(block)) !== null) {
    values.push(match[2]);
  }

  if (values.length === 0) {
    throw new Error(`No string entries parsed from ${name}.`);
  }

  return values;
}

function getMigrationClass(file) {
  const source = read(file);

  const matches = [
    ...source.matchAll(
      /export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface\b/g
    ),
  ];

  if (matches.length !== 1) {
    throw new Error(
      `${path.basename(file)} must contain exactly one exported MigrationInterface class; found ${matches.length}.`
    );
  }

  return matches[0][1];
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function datasourceUsesRegistry(datasourceSource) {
  const source = stripComments(datasourceSource);

  const importsMigrationClasses =
    /import\s*\{\s*[^}]*\bMIGRATION_CLASSES\b[^}]*\}\s*from\s*['"][^'"]*migration-classes['"]/m.test(source);

  const registersMigrationClasses =
    /\bmigrations\s*:\s*MIGRATION_CLASSES\b/m.test(source);

  const migrationClassesPath = path.join(root, 'migration-classes.ts');
  const canonicalMigrationsPath = path.join(root, 'canonical-migrations.ts');

  if (!fs.existsSync(migrationClassesPath) ||
      !fs.existsSync(canonicalMigrationsPath)) {
    return false;
  }

  const migrationClassesSource =
    stripComments(read(migrationClassesPath));

  const canonicalMigrationsSource =
    stripComments(read(canonicalMigrationsPath));

  const migrationClassesUsesCanonical =
    /canonical-migrations/.test(migrationClassesSource);

  const canonicalMigrationsUsesRegistry =
    /\bMIGRATION_REGISTRY\b/.test(canonicalMigrationsSource) &&
    /registry/.test(canonicalMigrationsSource);

  return importsMigrationClasses &&
    registersMigrationClasses &&
    migrationClassesUsesCanonical &&
    canonicalMigrationsUsesRegistry;
}

function main() {
  const registrySource = read(registryPath);
  const datasourceSource = read(datasourcePath);

  const registry = stringItems(
    arrayBlock(registrySource, 'MIGRATION_REGISTRY'),
    'MIGRATION_REGISTRY'
  );

  const allowlist = stringItems(
    arrayBlock(registrySource, 'DUPLICATE_TIMESTAMPS'),
    'DUPLICATE_TIMESTAMPS'
  );

  if (new Set(registry).size !== registry.length) {
    fail('Duplicate registry basenames detected.');
  }

  if (new Set(allowlist).size !== allowlist.length) {
    fail('Duplicate entries in DUPLICATE_TIMESTAMPS allowlist.');
  }

  const registered = new Set(registry);
  const classes = [];
  const timestamps = new Map();

  for (const name of registry) {
    if (!/^\d{8,14}-[A-Za-z0-9_-]+$/.test(name)) {
      fail(`Invalid migration registry basename: ${name}`);
      continue;
    }

    const file = path.join(root, `${name}.ts`);

    if (!fs.existsSync(file)) {
      fail(`Registry entry has no migration file: ${name}.ts`);
      continue;
    }

    let className;

    try {
      className = getMigrationClass(file);
    } catch (error) {
      fail(error.message);
      continue;
    }

    const suffix = className.match(/(\d{13})$/);

    if (!suffix) {
      fail(`Class name must end with a 13-digit timestamp: ${className}`);
      continue;
    }

    classes.push(className);

    if (!timestamps.has(suffix[1])) {
      timestamps.set(suffix[1], []);
    }

    timestamps.get(suffix[1]).push(className);
  }

  const migrationFiles = fs
    .readdirSync(root)
    .filter((file) => /^\d{8,14}-[A-Za-z0-9_-]+\.ts$/.test(file))
    .map((file) => file.slice(0, -3));

  for (const file of migrationFiles) {
    if (!registered.has(file)) {
      fail(`Migration file missing from registry: ${file}.ts`);
    }
  }

  const registryBackedDatasource =
    datasourceUsesRegistry(datasourceSource);

  if (!registryBackedDatasource) {
    fail(
      'Datasource must register MIGRATION_CLASSES through migration-classes.ts and canonical-migrations.ts using MIGRATION_REGISTRY.'
    );
  }

  const actualCollisions = [...timestamps.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([timestamp]) => timestamp)
    .sort();

  const allowedCollisions = [...allowlist].sort();

  console.log('Mode: static/read-only; no database connection attempted');
  console.log(`Registry entries: ${registry.length}`);
  console.log(`Migration files: ${migrationFiles.length}`);
  console.log(`Migration classes validated: ${classes.length}`);
  console.log(
    `Datasource registration: ${
      registryBackedDatasource
        ? 'authoritative MIGRATION_REGISTRY'
        : 'direct class references'
    }`
  );
  console.log(
    `Detected duplicate class timestamps: ${JSON.stringify(actualCollisions)}`
  );
  console.log(
    `Documented duplicate timestamps: ${JSON.stringify(allowedCollisions)}`
  );

  if (
    JSON.stringify(actualCollisions) !==
    JSON.stringify(allowedCollisions)
  ) {
    fail(
      'Detected timestamp collisions do not exactly match the documented allowlist.'
    );
  }

  if (failures.length > 0) {
    console.error(`\nMigration verification failed with ${failures.length} error(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(
    'PASS: migration registry, files, classes, datasource registration, and timestamp allowlist verified.'
  );
}

try {
  main();
} catch (error) {
  fail(error && error.message ? error.message : String(error));
  process.exitCode = 1;
}

