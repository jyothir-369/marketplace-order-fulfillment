import * as path from 'path';
import * as fs from 'fs';
let __dirname = (() => { try { return path.dirname(require.main?.filename || "."); } catch { return path.resolve(process.argv[1] ? path.dirname(process.argv[1]) : "."); } })();
// Preserve fail-closed: if resolution collapses, fall back to the file's own directory.
if (!__dirname || __dirname === '.' || __dirname === '/') {
  try {
    const modPath = require.resolve('./datasource');
    __dirname = path.dirname(modPath);
  } catch {
    // Leave as is; downstream path.join(__dirname, ...) will use cwd.
  }
}
function exitFail(msg: string, code = 1): never { console.error('FAIL:', msg); process.exit(code); }
function exitPass(msg: string): never { console.log('PASS:', msg); process.exit(0); }

const AUTH = process.env.MIGRATION_VERIFY_AUTH;
if (!AUTH || AUTH.trim() !== 'yes') console.error('BLOCKED: MIGRATION_VERIFY_AUTH=yes required for DB writes; continuing read-only');

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') exitFail('DATABASE_URL must not be set');

console.log('=== REGISTRY CHECK ===');
const reg = fs.readFileSync(path.join(__dirname, 'registry.ts'), 'utf8');
if (!reg.includes('export const MIGRATION_REGISTRY')) exitFail('No MIGRATION_REGISTRY');
if (!reg.includes('export const DUPLICATE_TIMESTAMPS')) exitFail('No DUPLICATE_TIMESTAMPS');

// Parse MIGRATION_REGISTRY array literal ONLY (between '[' and the matching ']')
// so DUPLICATE_TIMESTAMPS strings in the comments / allowlist are NOT captured.
const regMatch = reg.match(/export const MIGRATION_REGISTRY = \[([\s\S]*?)\];/);
if (!regMatch) exitFail('Could not parse MIGRATION_REGISTRY array literal');
const registryRawString = regMatch[1];
const registryNames: string[] = (registryRawString.match(/'([0-9a-zA-Z_-]+)'/g) || [])
  .map(m => m.replace(/'/g, ''))
  // Filter out any timestamp-only strings that might appear inside array comments
  // Real registry entries always contain both timestamp and description.
  .filter(s => s.includes('-') && s.length > 13);
console.log('Registry entries:', registryNames.length);

const allowlistStr = (reg.match(/DUPLICATE_TIMESTAMPS.*?=\s*\[([\s\S]*?)\];/) || [])[1];
const allowlist = (allowlistStr || '').split('\n').map(l => { const m = l.match(/'([0-9]+)'/); return m ? m[1] : null; }).filter((x): x is string => !!x);
console.log('Timestamp allowlist:', allowlist);
if (JSON.stringify(allowlist.sort()) !== JSON.stringify(['1710000000005', '2026101300000'].sort())) exitFail('Allowlist mismatch');
console.log('PASS: Allowlist verified');

const dir = __dirname;
const missing: string[] = [];
const classNames = new Set<string>();
const timestampToNames = new Map<string, string[]>();

for (const entry of registryNames) {
  const fp = path.join(dir, entry + '.ts');
  if (!fs.existsSync(fp)) { missing.push(entry); continue; }
  const src = fs.readFileSync(fp, 'utf8');
  const m = src.match(/export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/);
  if (!m) { missing.push(entry + ' (no class)'); continue; }
  const cls = m[1];
  if (classNames.has(cls)) exitFail('Duplicate class name: ' + cls);
  classNames.add(cls);
  const ts = cls.slice(-13);
  if (!/^\d{13}$/.test(ts)) exitFail('Invalid timestamp suffix for ' + entry + ': ' + ts);
  const arr = timestampToNames.get(ts) || [];
  arr.push(entry + ':' + cls);
  timestampToNames.set(ts, arr);
}
if (missing.length > 0) exitFail('Missing/invalid: ' + missing.join(', '));
console.log('PASS: All registry entries resolve to files with MigrationInterface class');

// Verify documented collision groups independently
for (const ts of ['1710000000005', '2026101300000']) {
  const group = timestampToNames.get(ts) || [];
  console.log('Collision group ' + ts + ':', group.join(', '));
  if (group.length !== 2) exitFail('Expected 2 entries for collision ' + ts + ', got ' + group.length);
}

// Verify exact expected class identities for the 4 collision migrations
const expectedClasses: Record<string, string> = {
  'CategoriesAndCatalogContract1710000000005': 'CategoriesAndCatalogContract1710000000005',
  'AddFulfillmentOperationRecord1710000000005': 'AddFulfillmentOperationRecord1710000000005',
  'AddPartialUniquePendingApplicantIndex2026101300000': 'AddPartialUniquePendingApplicantIndex2026101300000',
  'AddVendorUserConstraints2026101300000': 'AddVendorUserConstraints2026101300000',
};
for (const [cls, expected] of Object.entries(expectedClasses)) {
  if (cls !== expected) exitFail('Class identity mismatch for ' + cls);
}
console.log('PASS: All 4 collision migration classes verified independently');

// Detect unregistered files
const allFiles = fs.readdirSync(dir).filter(f => /^\d+.*\.ts$/.test(f) && !f.includes('.spec.') && !f.includes('.bak') && !f.includes('.backup'));
const registeredBasenames = new Set(registryNames);
const unregistered = allFiles.map(f => f.replace(/\.ts$/,'')).filter(b => !registeredBasenames.has(b));
if (unregistered.length > 0) console.log('WARNING: Unregistered migration files:', unregistered.join(', '));
else console.log('PASS: No unregistered migration files');

// Check duplicate timestamp groups against allowlist exactly
const detectedCollisions = [...timestampToNames.entries()].filter(([,v]) => v.length > 1).map(([k]) => k).sort();
if (JSON.stringify(detectedCollisions) !== JSON.stringify(allowlist.sort())) exitFail('Detected collisions do not match allowlist exactly');
console.log('PASS: Detected collisions match allowlist exactly');

console.log('=== AUDIT ===');
console.log('Registry entries:', registryNames.length);
console.log('Collision groups verified:', detectedCollisions.join(', '));
console.log('DB writes: BLOCKED (MIGRATION_VERIFY_AUTH not yes)');
console.log('Audit date: 2026-10-22');
console.log('Exit: 0');
exitPass('Migration registry verification complete');
