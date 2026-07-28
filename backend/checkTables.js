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
  try {
    await client.connect();
    console.log("Connected to PostgreSQL!");

    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname='public'
      ORDER BY tablename;
    `);

    console.table(result.rows);

    await client.end();
  } catch (err) {
    console.error(err);
  }
})();