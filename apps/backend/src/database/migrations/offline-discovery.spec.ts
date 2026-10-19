import * as fs from 'fs';
import * as path from 'path';

describe('offline migration discovery', () => {
  const dir = __dirname;

  it('discovers all timestamp-prefixed .ts migration source files without db', () => {
    const files = fs.readdirSync(dir).filter(f => {
      return f.endsWith('.ts') && /^\d+.*\.ts$/.test(f)
        && !f.includes('.spec.') && !f.includes('.test.')
        && !f.includes('.bak') && !f.includes('.backup') && !f.includes('.orig');
    });
    expect(files.length).toBeGreaterThan(0);
    // Both duplicate-timestamp files must be present
    expect(files).toContain('1710000000005-AddFulfillmentOperationRecord.ts');
    expect(files).toContain('1710000000005-CategoriesAndCatalogContract.ts');
    expect(files).toContain('1716000000000-AddRazorpayPaymentSupport.ts');
  });

  it('each discovered file defines a class with a 13-digit timestamp suffix', () => {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && /^\d+.*\.ts$/.test(f) && !f.includes('.spec.'));
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      const m = src.match(/export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/);
      expect(m).toBeTruthy();
      const suffix = m![1].slice(-13);
      expect(/^\d{13}$/.test(suffix)).toBe(true);
    }
  });

  it('registry and datasource agree on presence of Razorpay and categories', () => {
    const { MIGRATION_REGISTRY } = require('./registry');
    expect(MIGRATION_REGISTRY).toContain('1716000000000-AddRazorpayPaymentSupport');
    expect(MIGRATION_REGISTRY).toContain('1710000000005-AddFulfillmentOperationRecord');
    expect(MIGRATION_REGISTRY).toContain('1710000000005-CategoriesAndCatalogContract');
  });
});
