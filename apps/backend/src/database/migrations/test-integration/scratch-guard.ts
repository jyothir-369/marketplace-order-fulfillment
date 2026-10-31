/** Scratch-only guard: allow ONLY marketplace_vendor_column_repair_test on port 55439. */
export const ALLOWED_SCRATCH_DB = 'marketplace_vendor_column_repair_test';
export const ALLOWED_SCRATCH_PORT = '55439';
export const ALLOWED_SCRATCH_HOSTS = new Set(['localhost', '127.0.0.1']);
export function assertScratchOnly(urlStr: string): void {
  const parsed = new URL(urlStr.trim());
  if (parsed.hostname.toLowerCase() === 'localhost' || parsed.hostname === '127.0.0.1') { /* ok */ } else throw new Error('BLOCKED: scratch only allows localhost');
  if (parsed.port !== ALLOWED_SCRATCH_PORT) throw new Error('BLOCKED: scratch only allows port 55439');
  const dbName = parsed.pathname.slice(1).split('/')[0];
  if (dbName !== ALLOWED_SCRATCH_DB) throw new Error('BLOCKED: must target marketplace_vendor_column_repair_test, got ' + dbName);
}
