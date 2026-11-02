const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool = null;
let useMock = false;
const mockFilePath = path.join(__dirname, '../../mock_db.json');

// Initialize Mock JSON database file with default seeded role and admin data
const initMockFile = () => {
  if (!fs.existsSync(mockFilePath)) {
    const defaultData = {
      roles: [
        {
          id: "role-admin-1111",
          name: "Admin",
          description: "System Administrator with full access rights",
          permissions: ["users:read", "users:write", "roles:read", "roles:write", "tickets:read", "tickets:write", "tickets:delete", "settings:read", "settings:write"]
        },
        {
          id: "role-manager-2222",
          name: "Manager",
          description: "Support Manager oversight",
          permissions: ["users:read", "tickets:read", "tickets:write", "tickets:assign", "analytics:read"]
        },
        {
          id: "role-lead-3333",
          name: "Team Lead",
          description: "Support Team Lead",
          permissions: ["users:read", "tickets:read", "tickets:write", "tickets:assign", "analytics:read"]
        },
        {
          id: "role-engineer-4444",
          name: "Support Engineer",
          description: "Support Engineer resolver",
          permissions: ["tickets:read", "tickets:write", "tickets:resolve"]
        },
        {
          id: "role-client-5555",
          name: "Client",
          description: "End customer submitting tickets",
          permissions: ["tickets:create", "tickets:read", "tickets:comment"]
        }
      ],
      users: [
        {
          id: "user-admin-9999",
          name: "Administrator",
          email: "admin@desk.com",
          password_hash: "", // set below
          role_id: "role-admin-1111",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      refresh_tokens: [],
      password_resets: []
    };

    // Hash default password for admin account
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    defaultData.users[0].password_hash = bcrypt.hashSync('adminpassword', salt);

    fs.writeFileSync(mockFilePath, JSON.stringify(defaultData, null, 2));
  }
};

const getMockData = () => {
  initMockFile();
  const data = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
  if (!data.tickets) data.tickets = [];
  if (!data.ticket_comments) data.ticket_comments = [];
  return data;
};

const saveMockData = (data) => {
  fs.writeFileSync(mockFilePath, JSON.stringify(data, null, 2));
};

/**
 * Initialize the PostgreSQL connection pool and verify connectivity.
 * Returns a Promise that resolves when the connection is confirmed,
 * or rejects if the database is unreachable.
 *
 * Call this once from server.js before starting DB-dependent services.
 */
const getPool = () => {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
    const hasDiscreteConfig = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
      .every((name) => process.env[name] && process.env[name].trim());

    if (process.env.NODE_ENV === 'production' && !databaseUrl && !hasDiscreteConfig) {
      throw new Error(
        '[DB] Missing production database configuration. Set DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.'
      );
    }

    const config = databaseUrl
      ? {
          connectionString: databaseUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 10,
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'smart_support_desk',
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 10,
        };
    pool = new Pool(config);
  }
  return pool;
};

const connect = () => {
  return new Promise((resolve, reject) => {
    const p = getPool();
    p.query('SELECT 1')
      .then(() => {
        console.log('[DB] Successfully connected to PostgreSQL database.');
        useMock = false;
        resolve(p);
      })
      .catch((err) => {
        console.error('\n======================================================================');
        console.error('[DB] ERROR: Failed to connect to PostgreSQL database.');
        console.error(`[DB] Reason: ${err.message}`);
        console.error('[DB] Check DATABASE_URL or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.');
        console.error('[DB] Ensure PostgreSQL service is running and the database exists.');
        console.error('[DB] Run: npm run db:init  to initialize the schema.');
        console.error('======================================================================\n');
        useMock = false;
        reject(err);
      });
  });
};

module.exports = {
  isMock: () => useMock,
  getMockData,
  saveMockData,
  connect,
  query: (text, params) => {
    if (useMock) {
      throw new Error('Database pool query called while in mock mode.');
    }
    const p = getPool();
    return p.query(text, params);
  },
  get pool() { return getPool(); },
};
