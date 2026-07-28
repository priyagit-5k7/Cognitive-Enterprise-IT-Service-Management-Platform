require('dotenv').config();
const app = require('./src/app');
const http = require('http');
const socket = require('./src/config/socket');
const { pool } = require('./src/config/db');
const cronService = require('./src/services/cronService');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
socket.init(server);

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Smart Support Desk Server Running       `);
  console.log(` Port: ${PORT}                           `);
  console.log(` Environment: ${process.env.NODE_ENV}  `);
  console.log(`=========================================`);
  
  // Start background jobs
  cronService.start();
});

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down server gracefully...');
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('Database pool connection closed.');
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
