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

const testConnection = () => {
  try {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'smart_support_desk',
      connectionTimeoutMillis: 2000,
    });
    
    // Attempt a quick test query synchronously-ish or log on promise resolve
    pool.query('SELECT 1')
      .then(() => {
        console.log('Successfully connected to PostgreSQL database.');
      })
      .catch((err) => {
        console.warn('\n======================================================================');
        console.warn('WARNING: Failed to connect to PostgreSQL database.');
        console.warn(`Reason: ${err.message}`);
        console.warn('FALLING BACK: Operating in Local JSON File Database mode (mock_db.json).');
        console.warn('To use PostgreSQL, configure valid credentials in backend/.env and rerun npm run db:init');
        console.warn('======================================================================\n');
        useMock = true;
        initMockFile();
      });
  } catch (err) {
    useMock = true;
    initMockFile();
  }
};

testConnection();

module.exports = {
  isMock: () => useMock,
  getMockData,
  saveMockData,
  query: (text, params) => {
    if (useMock) {
      throw new Error('Database pool query called while in mock mode.');
    }
    return pool.query(text, params);
  },
  pool,
};
