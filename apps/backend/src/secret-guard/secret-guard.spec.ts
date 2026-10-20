describe('Secret-guard', () => {
  it('committed .env.example has placeholder only (no real secret)', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(__dirname, '../../.env.example');
    if (!fs.existsSync(filePath)) throw new Error('env example missing: ' + filePath);
    const text = fs.readFileSync(filePath, 'utf8');
    expect(text).not.toMatch(/^SUPABASE_SERVICE_ROLE_KEY=[A-Za-z0-9_\-]{8,}/m);
    expect(text).toContain('SUPABASE_SERVICE_ROLE_KEY=');
  });
});
