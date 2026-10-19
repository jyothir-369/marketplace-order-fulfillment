import { DataSource } from 'typeorm';
export const sqliteTestDataSource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  logging: false,
  entities: [],
});
