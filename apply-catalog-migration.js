const { Client } = require("/app/node_modules/pg");

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    await client.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "description" text
    `);

    await client.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "images" text[]
    `);

    console.log("Migration 1710000000007 schema changes applied successfully.");
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
