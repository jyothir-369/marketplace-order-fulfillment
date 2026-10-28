describe('datasource fail-closed URL validation', () => {
  const originalUrl = process.env.MIGRATION_TEST_DATABASE_URL;
  const originalLegacyPassword = process.env.MIGRATION_TEST_DB_PASSWORD;
  const originalGeneric = {
    DATABASE_URL: process.env.DATABASE_URL,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_DATABASE: process.env.DB_DATABASE,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
  };

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.MIGRATION_TEST_DATABASE_URL;
    } else {
      process.env.MIGRATION_TEST_DATABASE_URL = originalUrl;
    }
    if (originalLegacyPassword === undefined) {
      delete process.env.MIGRATION_TEST_DB_PASSWORD;
    } else {
      process.env.MIGRATION_TEST_DB_PASSWORD = originalLegacyPassword;
    }
    for (const [key, value] of Object.entries(originalGeneric)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.resetModules();
    jest.restoreAllMocks();
  });

  function loadParser(url: string | undefined) {
    if (url === undefined) delete process.env.MIGRATION_TEST_DATABASE_URL;
    else process.env.MIGRATION_TEST_DATABASE_URL = url;
    for (const key of [
      'DATABASE_URL', 'DB_HOST', 'DB_PORT',
      'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD',
    ]) delete process.env[key];
    jest.resetModules();

    jest.doMock('typeorm', () => ({
      DataSource: jest.fn().mockImplementation(() => ({
        initialize: jest.fn(),
        destroy: jest.fn(),
      })),
    }));

    return /* eslint-disable-line @typescript-eslint/no-var-requires */ require('../database/migrations/datasource')
      .parseMigrationTestDbUrl as () => {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
        protocol: string;
        query: string;
        fragment: string;
      };
  }

  it('throws when the dedicated URL is missing', () => {
    expect(() => loadParser(undefined)()).toThrow(/MIGRATION_TEST_DATABASE_URL/);
  });

  it('rejects an invalid protocol', () => {
    expect(() => loadParser('http://user:pass@localhost:55439/marketplace_migration_test')()).toThrow(/protocol/i);
  });

  it('rejects a non-loopback host', () => {
    expect(() => loadParser('postgresql://user:pass@example.com:55439/marketplace_migration_test')()).toThrow(/host/i);
  });

  it('rejects the wrong port', () => {
    expect(() => loadParser('postgresql://user:pass@localhost:5432/marketplace_migration_test')()).toThrow(/port/i);
  });

  it('rejects the wrong database', () => {
    expect(() => loadParser('postgresql://user:pass@localhost:55439/other_database')()).toThrow(/database/i);
  });

  it('rejects extra database path segments', () => {
    expect(() => loadParser('postgresql://user:pass@localhost:55439/marketplace_migration_test/extra')()).toThrow(/database/i);
  });

  it('rejects an empty database path', () => {
    expect(() => loadParser('postgresql://user:pass@localhost:55439/')()).toThrow(/database/i);
  });

  it('rejects query parameters', () => {
    expect(() => loadParser('postgresql://user:pass@localhost:55439/marketplace_migration_test?sslmode=require')()).toThrow(/query/i);
  });

  it('rejects fragments', () => {
    expect(() => loadParser('postgresql://user:pass@localhost:55439/marketplace_migration_test#unexpected')()).toThrow(/fragment/i);
  });

  it('accepts a valid local PostgreSQL URL', () => {
    const parser = loadParser(
      'postgresql://user:pass@localhost:55439/marketplace_migration_test',
    );
    const result = parser();
    expect(result.host).toBe('localhost');
    expect(result.port).toBe(55439);
    expect(result.username).toBe('user');
    expect(result.database).toBe('marketplace_migration_test');
    expect(result.protocol).toBe('postgresql:');
  });

  it('accepts 127.0.0.1 loopback host', () => {
    const parser = loadParser(
      'postgresql://test:pass@127.0.0.1:55439/marketplace_migration_test',
    );
    const result = parser();
    expect(result.host).toBe('127.0.0.1');
    expect(result.password).toBe('pass');
  });

  it('decodes URL-encoded username and password exactly once', () => {
    const parser = loadParser(
      'postgresql://user%40domain:p%40ss%23@localhost:55439/marketplace_migration_test',
    );
    const result = parser();
    expect(result.username).toBe('user@domain');
    expect(result.password).toBe('p@ss#');
  });

  it('uses the URL password for the datasource, not an independent legacy variable', () => {
    process.env.MIGRATION_TEST_DATABASE_URL =
      'postgresql://user:fromurl@localhost:55439/marketplace_migration_test';
    process.env.MIGRATION_TEST_DB_PASSWORD = 'fromlegacy';
    for (const key of [
      'DATABASE_URL', 'DB_HOST', 'DB_PORT',
      'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD',
    ]) delete process.env[key];
    jest.resetModules();
    jest.doMock('typeorm', () => ({
      DataSource: jest.fn().mockImplementation((options: any) => ({
        initialize: jest.fn(),
        destroy: jest.fn(),
        options,
      })),
    }));
        // Dynamic load preserved for jest.doMock()-ordered require. Essential runtime behavior.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getMigrationDataSourceLazy } = require('../database/migrations/datasource');
    const migrationDataSource = getMigrationDataSourceLazy();
    expect(migrationDataSource.options.password).toBe('fromurl');
    expect(migrationDataSource.options.password).not.toBe('fromlegacy');
  });

  it('rejects generic database override variables', () => {
    process.env.MIGRATION_TEST_DATABASE_URL =
      'postgresql://user:pass@localhost:55439/marketplace_migration_test';
    process.env.DATABASE_URL = 'postgresql://evil:evil@evil:5432/db';
    jest.resetModules();
    expect(() => require('../database/migrations/datasource').getMigrationDataSourceLazy() /* eslint-disable-next-line @typescript-eslint/no-var-requires */)
      .toThrow(/BLOCKED/);
  });
});
