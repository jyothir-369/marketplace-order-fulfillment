const { Client } = require("/app/node_modules/pg");

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT "timestamp", "name"
      FROM migrations
      WHERE "timestamp" = 1710000000007
    `);

    console.log(JSON.stringify(result.rows, null, 2));
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
