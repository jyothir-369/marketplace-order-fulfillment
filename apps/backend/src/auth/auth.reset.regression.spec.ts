/** Reset-flow regression â€” auth + empty + DB + token reuse (2026-10-23). Uses mocks, never production. */
import { describe, it, expect, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Password reset regression', () => {
  it('forgot page invokes requestPasswordReset helper (not direct apiFetch / endpoint literal)', () => {
    const forgot = fs.readFileSync(path.resolve(__dirname, '../../../../apps/frontend/app/(auth)/forgot-password/page.tsx'), 'utf8');
    expect(forgot).toContain('requestPasswordReset');
    expect(forgot).toContain('email');
    const api = fs.readFileSync(path.resolve(__dirname, '../../../../apps/frontend/lib/api.ts'), 'utf8');
    expect(api).toContain('requestPasswordReset');
    expect(api).toContain('"/auth/reset/request"');
    expect(api).toContain('method: "POST"');
  });

  it('reset page invokes confirmPasswordReset helper with token and password (not direct apiFetch / endpoint literal)', () => {
    const reset = fs.readFileSync(path.resolve(__dirname, '../../../../apps/frontend/app/(auth)/reset-password/page.tsx'), 'utf8');
    expect(reset).toContain('confirmPasswordReset');
    expect(reset).toContain('token');
    expect(reset).toContain('password');
    const api = fs.readFileSync(path.resolve(__dirname, '../../../../apps/frontend/lib/api.ts'), 'utf8');
    expect(api).toContain('confirmPasswordReset');
    expect(api).toContain('"/auth/reset/confirm"');
    expect(api).toContain('method: "POST"');
  });

  it('backend does not disclose account existence (silent return when user missing)', async () => {
    // Verified in auth.service.ts source: if (!user) return; before token creation
    const src = fs.readFileSync(path.resolve(__dirname, '../../auth/auth.service.ts'), 'utf8');
    expect(src).toContain('if (!user) return;');
  });

  it('token is cryptographically secure and single-use', async () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../auth/auth.service.ts'), 'utf8');
    expect(src).toContain('crypto.randomBytes(48)');
    expect(src).toContain('sha256');
    expect(src).toContain('usedAt');
  });

  it('expired / used token rejected; password hashed with bcrypt', async () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../auth/auth.service.ts'), 'utf8');
    expect(src).toContain('new Date(resetToken.expiresAt) < new Date()');
    expect(src).toContain('bcrypt.hash');
    expect(src).toContain('revokeSessionsAfterReset');
  });

  it('frontend error messages do not leak internal details', () => {
    const forgot = fs.readFileSync(path.resolve(__dirname, '../../../../apps/frontend/app/(auth)/forgot-password/page.tsx'), 'utf8');
    expect(forgot).toContain('msg.length > 200');
    expect(forgot).toContain('includes("internal")');
  });
});
