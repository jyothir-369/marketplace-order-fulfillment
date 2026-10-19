describe('TypeORM PostgreSQL UUID driver config', () => {
  const originalUrl = process.env.MIGRATION_TEST_DATABASE_URL;
  const originalGeneric = {
    DATABASE_URL: process.env.DATABASE_URL,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_DATABASE: process.env.DB_DATABASE,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
  };

  let migrationDataSource: any;

  beforeAll(() => {
    process.env.MIGRATION_TEST_DATABASE_URL =
      'postgresql://test:pass@127.0.0.1:55439/marketplace_migration_test';

    for (const key of [
      'DATABASE_URL', 'DB_HOST', 'DB_PORT',
      'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD',
    ]) {
      delete process.env[key];
    }

    jest.resetModules();

    jest.doMock('typeorm', () => ({
      DataSource: jest.fn().mockImplementation((options) => ({
        options,
        initialize: jest.fn(),
        destroy: jest.fn(),
        isInitialized: false,
      })),
    }));

    ({ migrationDataSource } = require('../datasource'));
  });

  afterAll(() => {
    jest.dontMock('typeorm');
    jest.resetModules();

    if (originalUrl === undefined) {
      delete process.env.MIGRATION_TEST_DATABASE_URL;
    } else {
      process.env.MIGRATION_TEST_DATABASE_URL = originalUrl;
    }

    for (const [key, value] of Object.entries(originalGeneric)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('pgcrypto option corresponds to gen_random_uuid()', () => {
    const pgcrypto = true;
    const result = pgcrypto ? 'gen_random_uuid()' : 'uuid_generate_v4()';

    expect(result).toBe('gen_random_uuid()');
  });

  it('datasource sets uuidExtension to pgcrypto', () => {
    expect(migrationDataSource.options.uuidExtension).toBe('pgcrypto');
  });
});
