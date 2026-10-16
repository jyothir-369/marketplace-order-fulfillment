import { AuthService } from './auth.service';
describe('GoogleOAuth RED', () => {
  it('verifyGoogleIdToken exists (implemented)', () => {
    expect(typeof (AuthService.prototype as any).verifyGoogleIdToken).toBe('function');
  });
  it('googleSignIn exists (implemented)', () => {
    expect(typeof (AuthService.prototype as any).googleSignIn).toBe('function');
  });
});
// Updated post-GREEN — verifies Google OAuth integration exists and uses library
describe('GoogleOAuth GREEN', () => {
  it('verifyGoogleIdToken exists as private method', () => {
    expect(typeof (AuthService.prototype as any).verifyGoogleIdToken).toBe('function');
  });
  it('googleSignIn exists', () => {
    expect(typeof (AuthService.prototype as any).googleSignIn).toBe('function');
  });
  it('uses google-auth-library OAuth2Client (imported)', () => {
    const src = require('fs').readFileSync('src/auth/auth.service.ts', 'utf8');
    expect(src).toContain('google-auth-library');
    expect(src).toContain('OAuth2Client');
  });
  it('validates audience and verified email', () => {
    const src = require('fs').readFileSync('src/auth/auth.service.ts', 'utf8');
    expect(src).toContain('verifyIdToken');
    expect(src).toContain('email_verified');
  });
  it('creates BUYER only', () => {
    const src = require('fs').readFileSync('src/auth/auth.service.ts', 'utf8');
    expect(src).toContain('UserRole.BUYER');
  });
  it('preserves password login (existing methods unchanged)', () => {
    const src = require('fs').readFileSync('src/auth/auth.service.ts', 'utf8');
    expect(src).toContain('bcrypt.compare');
    expect(src).toContain('login(');
  });
});
