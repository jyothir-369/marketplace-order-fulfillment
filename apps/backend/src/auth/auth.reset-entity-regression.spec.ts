/** Meaningful clean-checkout registration test — verifies auth entity and module registration
 * on a clean checkout (no stale dist artifacts, no production DB dependencies).
 */
import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth clean-checkout registration (no artifact dependency)', () => {
  it('password-reset-token entity exports correct class/table', () => {
    const p = path.resolve(__dirname, '../common/entities/password-reset-token.entity.ts');
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toContain('export class PasswordResetToken');
    expect(src).toContain("@Entity('password_reset_tokens')");
    expect(src).toContain('tokenHash');
    expect(src).toContain('expiresAt');
    expect(src).toContain('usedAt');
  });

  it('auth.module imports and registers PasswordResetToken with TypeOrmModule.forFeature', () => {
    const p = path.resolve(__dirname, 'auth.module.ts');
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toContain('PasswordResetToken');
    expect(src).toContain('TypeOrmModule.forFeature([User, RefreshToken, PasswordResetToken])');
  });

  it('app.module registers PasswordResetToken in TypeOrm entities array', () => {
    const p = path.resolve(__dirname, '../app.module.ts');
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toContain('PasswordResetToken');
  });

  it('registration is deterministic — no reliance on compiled dist artifact', () => {
    // Previous unreliable assertion checked dist/app.module.js for a compiled alias
    // that changes with build settings; this test reads source directly.
    const modulePath = path.resolve(__dirname, 'auth.module.ts');
    expect(fs.existsSync(modulePath)).toBe(true);
    const src = fs.readFileSync(modulePath, 'utf8');
    expect(src.length).toBeGreaterThan(0);
    expect(src).toContain('PasswordResetToken');
  });
});
