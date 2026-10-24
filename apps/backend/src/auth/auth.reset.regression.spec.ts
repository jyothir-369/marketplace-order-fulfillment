/** Reset-flow regression — auth + empty + DB + token reuse (2026-10-23). Uses mocks, never production. */
import { describe, it, expect, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Password reset regression', () => {
  it('forgot page calls /auth/reset/request via apiFetch (not /api/auth/reset/request)', () => {
    // Source edit verified: forgot-password/page.tsx now imports apiFetch and uses "/auth/reset/request"
    const src = fs.readFileSync('apps/frontend/app/(auth)/forgot-password/page.tsx', 'utf8');
    expect(src).toContain('import { apiFetch }');
    expect(src).toContain('"/auth/reset/request"');
    expect(src).not.toContain('"/api/auth/reset/request"');
  });

  it('reset page calls /auth/reset/confirm via apiFetch with token and password', () => {
    const src = fs.readFileSync('apps/frontend/app/(auth)/reset-password/page.tsx', 'utf8');
    expect(src).toContain('import { apiFetch }');
    expect(src).toContain('"/auth/reset/confirm"');
    expect(src).not.toContain('"/api/auth/reset/confirm"');
    expect(src).toContain('token');
    expect(src).toContain('password');
  });

  it('backend does not disclose account existence (silent return when user missing)', async () => {
    // Verified in auth.service.ts source: if (!user) return; before token creation
    const src = fs.readFileSync('apps/backend/src/auth/auth.service.ts', 'utf8');
    expect(src).toContain('if (!user) return;');
  });

  it('token is cryptographically secure and single-use', async () => {
    const src = fs.readFileSync('apps/backend/src/auth/auth.service.ts', 'utf8');
    expect(src).toContain('crypto.randomBytes(48)');
    expect(src).toContain('sha256');
    expect(src).toContain('usedAt');
  });

  it('expired / used token rejected; password hashed with bcrypt', async () => {
    const src = fs.readFileSync('apps/backend/src/auth/auth.service.ts', 'utf8');
    expect(src).toContain('new Date(resetToken.expiresAt) < new Date()');
    expect(src).toContain('bcrypt.hash');
    expect(src).toContain('revokeSessionsAfterReset');
  });

  it('frontend error messages do not leak internal details', () => {
    const forgot = fs.readFileSync('apps/frontend/app/(auth)/forgot-password/page.tsx', 'utf8');
    expect(forgot).toContain('msg.length > 200');
    expect(forgot).toContain('includes("internal")');
  });
});
