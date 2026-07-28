const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

(async () => {
  await client.connect();

  const result = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name='users'
    ORDER BY ordinal_position;
  `);

  console.table(result.rows);

  await client.end();
})();