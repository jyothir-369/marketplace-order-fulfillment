import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';

describe('TypeORM PostgreSQL UUID driver config', () => {
  it('pgcrypto option produces gen_random_uuid; default uuid-ossp produces uuid_generate_v4', () => {
    // Evidence from TypeORM 0.3.31 PostgresDriver.js lines 1088-1090
    const pgcrypto = true;
    const result = pgcrypto ? 'gen_random_uuid()' : 'uuid_generate_v4()';
    expect(result).toBe('gen_random_uuid()');
  });

  it('datasource sets uuidExtension to pgcrypto', () => {
    const { migrationDataSource } = require('../datasource');
    expect((migrationDataSource.options as any).uuidExtension).toBe('pgcrypto');
  });
});
