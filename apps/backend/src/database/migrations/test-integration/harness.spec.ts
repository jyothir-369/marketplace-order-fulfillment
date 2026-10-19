import { afterEach, describe, expect, it, jest } from '@jest/globals';
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

describe('migration test connection boundary', () => {
  const invalidUrls: Array<string | undefined> = [
    undefined,
    'not-a-database-url',
    'mysql://user:pass@127.0.0.1:55439/marketplace_migration_test',
    'postgresql://user:pass@example.com:55439/marketplace_migration_test',
    'postgresql://user:pass@127.0.0.1:5432/marketplace_migration_test',
    'postgresql://user:pass@127.0.0.1:55439/marketplace_upgrade',
    'postgresql://user:pass@127.0.0.1:55439/marketplace_migration_test?sslmode=require',
    'postgresql://127.0.0.1:55439/marketplace_migration_test',
  ];

  it.each(invalidUrls)(
    'does not construct or initialize a connection for invalid URL: %s',
    async (url) => {
      if (url === undefined) {
        delete process.env[ENV_KEY];
      } else {
        process.env[ENV_KEY] = url;
      }

      const initialize = jest.fn<() => Promise<unknown>>(
        () => Promise.resolve(undefined),
      );
      const createDataSource = jest.fn(
        (_url: string) => ({ initialize }),
      );

      const { initializeTestDataSource } = await import('./harness');

      await expect(
        initializeTestDataSource(createDataSource),
      ).rejects.toThrow(/BLOCKED:/);

      expect(createDataSource).not.toHaveBeenCalled();
      expect(initialize).not.toHaveBeenCalled();
    },
  );

  it('constructs and initializes only after a valid URL passes validation', async () => {
    process.env[ENV_KEY] = validUrl;

    const initialize = jest.fn<() => Promise<unknown>>(
      () => Promise.resolve(undefined),
    );
    const dataSource = { initialize };
    const createDataSource = jest.fn(
      (_url: string) => dataSource,
    );

    const { initializeTestDataSource } = await import('./harness');

    await expect(
      initializeTestDataSource(createDataSource),
    ).resolves.toBe(dataSource);

    expect(createDataSource).toHaveBeenCalledTimes(1);
    expect(createDataSource).toHaveBeenCalledWith(validUrl);
    expect(initialize).toHaveBeenCalledTimes(1);
  });
});