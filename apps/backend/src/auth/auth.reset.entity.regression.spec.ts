import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('PasswordResetToken entity registration', () => {
  it('entity file exists and exports class with correct name/table', () => {
    const src = fs.readFileSync('apps/backend/src/common/entities/password-reset-token.entity.ts', 'utf8');
    expect(src).toContain('export class PasswordResetToken');
    expect(src).toContain("@Entity('password_reset_tokens')");
  });

  it('app.module registers PasswordResetToken in TypeOrm entities', () => {
    const src = fs.readFileSync('apps/backend/src/app.module.ts', 'utf8');
    expect(src).toContain('PasswordResetToken');
  });

  it('auth.module uses TypeOrmModule.forFeature with PasswordResetToken', () => {
    const src = fs.readFileSync('apps/backend/src/auth/auth.module.ts', 'utf8');
    expect(src).toContain('TypeOrmModule.forFeature([User, RefreshToken, PasswordResetToken])');
  });

  it('security preserved: hash + usedAt + expiresAt present', () => {
    const src = fs.readFileSync('apps/backend/src/common/entities/password-reset-token.entity.ts', 'utf8');
    expect(src).toContain('tokenHash');
    expect(src).toContain('expiresAt');
    expect(src).toContain('usedAt');
  });
});
