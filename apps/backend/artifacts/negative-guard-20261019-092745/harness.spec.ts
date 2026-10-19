import { afterEach, describe, expect, it } from '@jest/globals';
import { requireTestUrl } from './harness';

const ENV_KEY = 'MIGRATION_TEST_DATABASE_URL';
const originalValue = process.env[ENV_KEY];

const validUrl =
  'postgresql://migration_test:local_test_password@127.0.0.1:55439/marketplace_migration_test';

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = originalValue;
  }
});

describe('migration test URL guard', () => {
  it('accepts the designated local test database URL', () => {
    process.env[ENV_KEY] = validUrl;
    expect(requireTestUrl()).toBe(validUrl);
  });

  it('rejects a missing URL', () => {
    delete process.env[ENV_KEY];
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });

  it('rejects malformed URLs', () => {
    process.env[ENV_KEY] = 'not-a-database-url';
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });

  it('rejects unsupported protocols', () => {
    process.env[ENV_KEY] =
      'mysql://user:pass@127.0.0.1:55439/marketplace_migration_test';
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });

  it('rejects non-loopback hosts', () => {
    process.env[ENV_KEY] =
      'postgresql://user:pass@example.com:55439/marketplace_migration_test';
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });

  it('rejects incorrect ports', () => {
    process.env[ENV_KEY] =
      'postgresql://user:pass@127.0.0.1:5432/marketplace_migration_test';
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });

  it('rejects other database names', () => {
    process.env[ENV_KEY] =
      'postgresql://user:pass@127.0.0.1:55439/marketplace_upgrade';
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });

  it('rejects query parameters', () => {
    process.env[ENV_KEY] = `${validUrl}?sslmode=require`;
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });

  it('rejects URL fragments', () => {
    process.env[ENV_KEY] = `${validUrl}#unexpected`;
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });

  it('rejects missing credentials', () => {
    process.env[ENV_KEY] =
      'postgresql://127.0.0.1:55439/marketplace_migration_test';
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });

  it('rejects surrounding whitespace', () => {
    process.env[ENV_KEY] = ` ${validUrl}`;
    expect(() => requireTestUrl()).toThrow(/BLOCKED:/);
  });
});
