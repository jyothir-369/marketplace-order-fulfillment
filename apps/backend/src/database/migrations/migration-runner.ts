import { migrationDataSource } from './datasource';
import { Baseline0000000000000 } from './0000000000000-Baseline';
import { AddShippingAddressToOrders1710000000001 } from './1710000000001-AddShippingAddressToOrders';
import { BackfillShippingAddress1710000000002 } from './1710000000002-BackfillShippingAddress';
import { AddOrderNumber1710000000003 } from './1710000000003-AddOrderNumber';
import { AddUsersAndRefreshTokens1710000000004 } from './1710000000004-AddUsersAndRefreshTokens';
import { CategoriesAndCatalogContract1710000000005 } from './1710000000005-CategoriesAndCatalogContract';
import { AddMissingForeignKeysAndIndexes1710000000006 } from './1710000000006-AddMissingForeignKeysAndIndexes';
import { AddProductDescriptionAndImages1710000000007 } from './1710000000007-AddProductDescriptionAndImages';
import { AddOrderNumberSequence1710000000008 } from './1710000000008-AddOrderNumberSequence';

const migrations = [
  Baseline0000000000000,
  AddShippingAddressToOrders1710000000001,
  BackfillShippingAddress1710000000002,
  AddOrderNumber1710000000003,
  AddUsersAndRefreshTokens1710000000004,
  CategoriesAndCatalogContract1710000000005,
  AddMissingForeignKeysAndIndexes1710000000006,
  AddProductDescriptionAndImages1710000000007,
  AddOrderNumberSequence1710000000008,
];

async function runMigrations() {
  console.log('Starting migration runner...');
  const dbOptions = migrationDataSource.options as any;
  console.log('Database:', dbOptions.database);
  console.log('Host:', dbOptions.host);

  try {
    await migrationDataSource.initialize();
    console.log('Data source initialized');

    const command = process.argv[2] || 'up';

    if (command === 'up') {
      console.log('Running pending migrations...');
      await migrationDataSource.runMigrations();
      console.log('Migrations completed successfully');
    } else if (command === 'down') {
      const downMigrations = [...migrations].reverse();
      console.log('Reverting last migration...');
      for (const Migration of downMigrations) {
        try {
          await migrationDataSource.undoLastMigration();
          console.log('Reverted:', Migration.name);
          break;
        } catch (error) {
          console.log('Could not revert', Migration.name, ':', error);
        }
      }
    } else if (command === 'status') {
      const status = await migrationDataSource.showMigrations();
      console.log('Migration status:', status);
    } else if (command === 'revert') {
      const migrationName = process.argv[3];
      if (!migrationName) {
        console.error('Please specify migration name: npm run migration:revert <migration-name>');
        process.exit(1);
      }
      const queryRunner = migrationDataSource.createQueryRunner();
      await queryRunner.connect();
      const migration = migrations.find(m => m.name === migrationName);
      if (migration) {
        const migrationInstance = new migration();
        await migrationInstance.down(queryRunner);
        console.log('Reverted:', migrationName);
      } else {
        console.error('Migration not found:', migrationName);
        process.exit(1);
      }
      await queryRunner.release();
    }

    await migrationDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();