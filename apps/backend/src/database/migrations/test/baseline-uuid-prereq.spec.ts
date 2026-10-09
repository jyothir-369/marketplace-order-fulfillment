import { Baseline1709999999999 } from '../1709999999999-Baseline';
describe('Baseline UUID prereq', () => {
  it('uses gen_random_uuid and creates pgcrypto extension (not uuid_generate_v4)', () => {
    const src = new Baseline1709999999999();
    const upStr = src.up.toString();
    expect(upStr).toContain('CREATE EXTENSION IF NOT EXISTS');
    expect(upStr).toContain('gen_random_uuid');
    expect(upStr).not.toContain('uuid_generate_v4');
  });
});

describe('All migrations UUID consistency', () => {
  const noms = ['1709999999999-Baseline','1710000000003-AddOrderNumber','1710000000004-AddUsersAndRefreshTokens','1710000000009-AddPaymentAuthorizations'];
  it('no migration contains uuid_generate_v4 except test assertion', () => {
    const fs = require('fs'), path = require('path'), dir = path.resolve(__dirname, '..');
    const files = fs.readdirSync(dir).filter((f:any) => f.endsWith('.ts') && !f.includes('.spec.'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      expect(content).not.toContain('uuid_generate_v4');
    }
  });
});
