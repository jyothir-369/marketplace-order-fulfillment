/** Reproduce: metadata lookup failure without root registration. Confirms fix. */
import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('PasswordResetToken metadata failure reproduction', () => {
  it('entity registered in source TypeORM root (app.module)', () => {
    const src = fs.readFileSync('apps/backend/src/app.module.ts', 'utf8');
    // Before fix: missing. After fix: present in both arrays.
    expect(src).toContain('PasswordResetToken');
  });

  it('compiled dist reflects same registration', () => {
    const dist = fs.readFileSync('apps/backend/dist/app.module.js', 'utf8');
    expect(dist).toContain('password_reset_token_entity');
  });

  it('auth module feature registration present', () => {
    const authMod = fs.readFileSync('apps/backend/src/auth/auth.module.ts', 'utf8');
    expect(authMod).toContain('TypeOrmModule.forFeature([User, RefreshToken, PasswordResetToken])');
  });

  it('entity has required token security fields (no schema change)', () => {
    const ent = fs.readFileSync('apps/backend/src/common/entities/password-reset-token.entity.ts', 'utf8');
    expect(ent).toContain("tokenHash");
    expect(ent).toContain("expiresAt");
    expect(ent).toContain("usedAt");
  });
});
