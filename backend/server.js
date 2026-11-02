require('dotenv').config();
const app = require('./src/app');
const http = require('http');
const socket = require('./src/config/socket');
const db = require('./src/config/db');
const cronService = require('./src/services/cronService');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
socket.init(server);

/**
 * Startup sequence:
 * 1. Load env (dotenv above)
 * 2. Connect to PostgreSQL and await readiness
 * 3. Start DB-dependent services (SLA policies, cron jobs)
 * 4. Begin listening on the HTTP port
 */
async function startServer() {
  try {
    // Step 2 — Await confirmed PostgreSQL connection
    await db.connect();

    // Step 3 — Start background/database-dependent services
    // SLA policies are loaded inside cronService.start() after DB is ready
    cronService.start();

    // Step 4 — Start HTTP server
    server.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(` Smart Support Desk Server Running       `);
      console.log(` Port: ${PORT}                           `);
      console.log(` Environment: ${process.env.NODE_ENV}  `);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error('[Startup] FATAL: Could not connect to the database. Server will not start.');
    console.error('[Startup] Fix the database connection settings in backend/.env and retry.');
    process.exit(1);
  }
}

startServer();

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down server gracefully...');
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      const activePool = db.pool;
      if (activePool) {
        await activePool.end();
        console.log('Database pool connection closed.');
      }
      process.exit(0);
    } catch (err) {
      console.error('Error closing database pool:', err);
      process.exit(1);
    }
  });

  // Force close after 10s if graceful fails
  setTimeout(() => {
    console.error('Force shutting down due to timeout...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
