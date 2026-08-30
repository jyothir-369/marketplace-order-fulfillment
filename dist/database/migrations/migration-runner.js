"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const datasource_1 = require("./datasource");
const _1710000000001_AddShippingAddressToOrders_1 = require("./1710000000001-AddShippingAddressToOrders");
const _1710000000002_BackfillShippingAddress_1 = require("./1710000000002-BackfillShippingAddress");
const migrations = [
    _1710000000001_AddShippingAddressToOrders_1.AddShippingAddressToOrders1710000000001,
    _1710000000002_BackfillShippingAddress_1.BackfillShippingAddress1710000000002,
];
async function runMigrations() {
    console.log('Starting migration runner...');
    const dbOptions = datasource_1.migrationDataSource.options;
    console.log('Database:', dbOptions.database);
    console.log('Host:', dbOptions.host);
    try {
        await datasource_1.migrationDataSource.initialize();
        console.log('Data source initialized');
        const command = process.argv[2] || 'up';
        if (command === 'up') {
            console.log('Running pending migrations...');
            await datasource_1.migrationDataSource.runMigrations();
            console.log('Migrations completed successfully');
        }
        else if (command === 'down') {
            const downMigrations = [...migrations].reverse();
            console.log('Reverting last migration...');
            for (const Migration of downMigrations) {
                try {
                    await datasource_1.migrationDataSource.undoLastMigration();
                    console.log('Reverted:', Migration.name);
                    break;
                }
                catch (error) {
                    console.log('Could not revert', Migration.name, ':', error);
                }
            }
        }
        else if (command === 'status') {
            const status = await datasource_1.migrationDataSource.showMigrations();
            console.log('Migration status:', status);
        }
        else if (command === 'revert') {
            const migrationName = process.argv[3];
            if (!migrationName) {
                console.error('Please specify migration name: npm run migration:revert <migration-name>');
                process.exit(1);
            }
            const queryRunner = datasource_1.migrationDataSource.createQueryRunner();
            await queryRunner.connect();
            const migration = migrations.find(m => m.name === migrationName);
            if (migration) {
                const migrationInstance = new migration();
                await migrationInstance.down(queryRunner);
                console.log('Reverted:', migrationName);
            }
            else {
                console.error('Migration not found:', migrationName);
                process.exit(1);
            }
            await queryRunner.release();
        }
        await datasource_1.migrationDataSource.destroy();
        process.exit(0);
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
runMigrations();
//# sourceMappingURL=migration-runner.js.map