const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function initDb() {
  console.log('Starting Database Initialization...');

  // 1. Connect to 'postgres' default database to check/create target database
  const client = new Client({ ...dbConfig, database: 'postgres' });
  try {
    await client.connect();
    console.log('Connected to default database "postgres".');

    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.DB_NAME || 'smart_support_desk']
    );

    if (res.rowCount === 0) {
      console.log(`Database "${process.env.DB_NAME}" does not exist. Creating it...`);
      // CREATE DATABASE cannot run in a transaction block
      await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'smart_support_desk'}`);
      console.log(`Database "${process.env.DB_NAME}" created successfully.`);
    } else {
      console.log(`Database "${process.env.DB_NAME}" already exists.`);
    }
  } catch (err) {
    console.error('Error checking/creating database:', err.message);
    console.log('Please check your PostgreSQL credentials in backend/.env');
    process.exit(1);
  } finally {
    await client.end();
  }

  // 2. Connect to the target database to run migrations and seed
  const targetClient = new Client({
    ...dbConfig,
    database: process.env.DB_NAME || 'smart_support_desk',
  });

  try {
    await targetClient.connect();
    console.log(`Connected to target database "${process.env.DB_NAME}".`);

    // --- Automatic Incompatibility Check ---
    console.log('Checking database schema compatibility...');
    let incompatibleSchema = false;

    // Check if the 'users' table exists
    const checkTableExists = await targetClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (checkTableExists.rows[0].exists) {
      // 1. Check data type of users.id
      const checkIdType = await targetClient.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id';
      `);
      
      if (checkIdType.rowCount > 0) {
        const idType = checkIdType.rows[0].data_type;
        if (idType !== 'uuid') {
          console.warn(`WARNING: Existing 'users' table has incompatible 'id' column type: "${idType}" (expected UUID).`);
          incompatibleSchema = true;
        }
      }

      // 2. Check if 'role_id' column exists (expected in enterprise schema)
      const checkRoleIdExists = await targetClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'role_id'
        );
      `);
      if (!checkRoleIdExists.rows[0].exists) {
        console.warn(`WARNING: Existing 'users' table is missing the required 'role_id' column.`);
        incompatibleSchema = true;
      }
    }

    if (incompatibleSchema) {
      console.log('Incompatible schema detected. Automatically dropping existing tables with CASCADE...');
      await targetClient.query(`
        DROP TABLE IF EXISTS saved_searches CASCADE;
        DROP TABLE IF EXISTS ai_feedback CASCADE;
        DROP TABLE IF EXISTS documents CASCADE;
        DROP TABLE IF EXISTS notification_preferences CASCADE;
        DROP TABLE IF EXISTS notifications CASCADE;
        DROP TABLE IF EXISTS sla_policies CASCADE;
        DROP TABLE IF EXISTS ai_predictions CASCADE;
        DROP TABLE IF EXISTS knowledge_base CASCADE;
        DROP TABLE IF EXISTS ticket_attachments CASCADE;
        DROP TABLE IF EXISTS ticket_history CASCADE;
        DROP TABLE IF EXISTS ticket_comments CASCADE;
        DROP TABLE IF EXISTS tickets CASCADE;
        DROP TABLE IF EXISTS refresh_tokens CASCADE;
        DROP TABLE IF EXISTS password_resets CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS roles CASCADE;
        DROP TABLE IF EXISTS ticket_categories CASCADE;
      `);
      console.log('Existing incompatible tables dropped.');
    }

    // Create Tables
    console.log('Creating tables...');

    // 1. Roles Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Users Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        status VARCHAR(20) NOT NULL DEFAULT 'Active',
        deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Refresh Tokens Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Password Reset Tokens Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Ticket Categories Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ticket_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        color VARCHAR(20) NOT NULL,
        icon VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Tickets Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number VARCHAR(30) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category_id UUID NOT NULL REFERENCES ticket_categories(id) ON DELETE RESTRICT,
        priority VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Open',
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        sla_due_date TIMESTAMP WITH TIME ZONE,
        sla_breached BOOLEAN DEFAULT FALSE,
        due_date TIMESTAMP WITH TIME ZONE,
        closed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Ticket Comments Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Ticket Attachments Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Ticket History Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. AI Predictions Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ai_predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID UNIQUE NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        predicted_category VARCHAR(100),
        predicted_priority VARCHAR(20),
        confidence INTEGER,
        suggested_resolution TEXT,
        estimated_resolution_time VARCHAR(50),
        recommended_engineer UUID REFERENCES users(id) ON DELETE SET NULL,
        similar_tickets JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Knowledge Base Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        problem TEXT NOT NULL,
        solution TEXT NOT NULL,
        keywords TEXT[] NOT NULL DEFAULT '{}',
        category VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. SLA Policies Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS sla_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        priority VARCHAR(20) UNIQUE NOT NULL,
        response_time_minutes INTEGER NOT NULL,
        resolution_time_minutes INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. Notifications Table
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        link VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes
    console.log('Creating database indexes...');
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_ai_predictions_ticket_id ON ai_predictions(ticket_id);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_ai_predictions_category ON ai_predictions(predicted_category);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);`);

    // Phase 6-12: Extend existing tables with new columns (idempotent ADD COLUMN IF NOT EXISTS)
    console.log('Applying Phase 6-12 schema extensions...');

    // Extend notifications table (Phase 7)
    await targetClient.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';`);
    await targetClient.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;`);

    // Extend knowledge_base table (Phase 9)
    await targetClient.query(`ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';`);
    await targetClient.query(`ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;`);
    await targetClient.query(`ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;`);
    await targetClient.query(`ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;`);
    await targetClient.query(`ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
    await targetClient.query(`ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;`);
    await targetClient.query(`ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;`);

    // Extend ai_predictions table (Phase 10)
    await targetClient.query(`ALTER TABLE ai_predictions ADD COLUMN IF NOT EXISTS feedback_label VARCHAR(50);`);
    await targetClient.query(`ALTER TABLE ai_predictions ADD COLUMN IF NOT EXISTS feedback_score INTEGER;`);
    await targetClient.query(`ALTER TABLE ai_predictions ADD COLUMN IF NOT EXISTS explanation TEXT;`);
    await targetClient.query(`ALTER TABLE ai_predictions ADD COLUMN IF NOT EXISTS kb_article_ids TEXT[];`);

    // Extend ticket_attachments table (Phase 12)
    await targetClient.query(`ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;`);
    await targetClient.query(`ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);`);
    await targetClient.query(`ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;`);

    // New Table: Documents (Phase 12)
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
        uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        version INTEGER DEFAULT 1,
        checksum VARCHAR(64),
        is_deleted BOOLEAN DEFAULT FALSE,
        replaced_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // New Table: AI Feedback (Phase 10)
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        prediction_id UUID REFERENCES ai_predictions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label VARCHAR(50) NOT NULL,
        score INTEGER CHECK (score BETWEEN 1 AND 5),
        comments TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // New Table: Saved Searches (Phase 11)
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'all',
        is_recent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // New Table: Notification Preferences (Phase 7)
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_enabled BOOLEAN DEFAULT TRUE,
        push_enabled BOOLEAN DEFAULT TRUE,
        sla_alerts BOOLEAN DEFAULT TRUE,
        ticket_updates BOOLEAN DEFAULT TRUE,
        ai_recommendations BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Phase 11: GIN full-text search index on tickets
    await targetClient.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_fts
      ON tickets USING GIN(to_tsvector('english', title || ' ' || description));
    `).catch(() => console.log('GIN index on tickets skipped (might already exist).'));

    // Phase 9: GIN full-text search index on knowledge_base
    await targetClient.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_fts
      ON knowledge_base USING GIN(to_tsvector('english', title || ' ' || problem || ' ' || solution));
    `).catch(() => console.log('GIN index on knowledge_base skipped (might already exist).'));

    // Phase 12: indexes
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_documents_ticket_id ON documents(ticket_id);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_documents_checksum ON documents(checksum);`);
    // Phase 7: notification indexes
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);`);
    // Phase 11: saved_searches index
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);`);

    console.log('Phase 6-12 schema extensions applied.');

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 12 FULL: Document Management Extensions
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 12 full document schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS document_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'Folder',
        color VARCHAR(20) DEFAULT '#6366F1',
        parent_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        checksum VARCHAR(64),
        uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        change_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS document_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Extend documents table with category and metadata
    await targetClient.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL;`);
    await targetClient.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT;`);
    await targetClient.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_path VARCHAR(255) DEFAULT '/';`);
    await targetClient.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';`);
    await targetClient.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`);
    await targetClient.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;`);
    await targetClient.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);`);
    // Seed default document categories
    const docCategories = [
      { name: 'General', description: 'General documents', icon: 'Folder', color: '#6366F1' },
      { name: 'Policies', description: 'Company policies and procedures', icon: 'FileText', color: '#10B981' },
      { name: 'Technical', description: 'Technical documentation', icon: 'Code', color: '#3B82F6' },
      { name: 'HR Documents', description: 'Human resources documents', icon: 'Users', color: '#F59E0B' },
      { name: 'Contracts', description: 'Contracts and legal documents', icon: 'Shield', color: '#EF4444' },
    ];
    for (const cat of docCategories) {
      await targetClient.query(
        `INSERT INTO document_categories (name, description, icon, color) VALUES ($1,$2,$3,$4) ON CONFLICT (name) DO NOTHING`,
        [cat.name, cat.description, cat.icon, cat.color]
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 13: Asset Management
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 13 asset management schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS asset_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'Box',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) UNIQUE NOT NULL,
        contact_name VARCHAR(100),
        contact_email VARCHAR(100),
        contact_phone VARCHAR(30),
        website VARCHAR(200),
        address TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_tag VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category_id UUID REFERENCES asset_categories(id) ON DELETE SET NULL,
        vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'Available',
        condition VARCHAR(30) DEFAULT 'Good',
        serial_number VARCHAR(100),
        model VARCHAR(100),
        manufacturer VARCHAR(100),
        purchase_date DATE,
        purchase_cost NUMERIC(12,2),
        warranty_expiry DATE,
        depreciation_rate NUMERIC(5,2) DEFAULT 0,
        current_value NUMERIC(12,2),
        location VARCHAR(200),
        ip_address VARCHAR(45),
        mac_address VARCHAR(17),
        os_type VARCHAR(50),
        os_version VARCHAR(50),
        notes TEXT,
        qr_code TEXT,
        barcode TEXT,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP WITH TIME ZONE,
        retired_at TIMESTAMP WITH TIME ZONE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS asset_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        returned_at TIMESTAMP WITH TIME ZONE,
        return_condition VARCHAR(30),
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS asset_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_number VARCHAR(50) UNIQUE NOT NULL,
        vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
        status VARCHAR(30) DEFAULT 'Draft',
        total_amount NUMERIC(14,2),
        order_date DATE,
        delivery_date DATE,
        notes TEXT,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset_id ON asset_assignments(asset_id);`);
    // Seed asset categories
    const assetCats = [
      { name: 'Laptop', icon: 'Laptop' }, { name: 'Desktop', icon: 'Monitor' },
      { name: 'Server', icon: 'Server' }, { name: 'Network Device', icon: 'Wifi' },
      { name: 'Printer', icon: 'Printer' }, { name: 'Mobile Device', icon: 'Smartphone' },
      { name: 'Software License', icon: 'Key' }, { name: 'Peripheral', icon: 'Mouse' },
    ];
    for (const ac of assetCats) {
      await targetClient.query(
        `INSERT INTO asset_categories (name, icon) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING`,
        [ac.name, ac.icon]
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 14: Change Management (ITIL)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 14 change management schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS change_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        change_number VARCHAR(30) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        change_type VARCHAR(30) NOT NULL DEFAULT 'Normal',
        status VARCHAR(30) NOT NULL DEFAULT 'Draft',
        priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
        risk_level VARCHAR(20) DEFAULT 'Low',
        risk_assessment TEXT,
        implementation_plan TEXT,
        rollback_plan TEXT,
        business_justification TEXT,
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        cab_required BOOLEAN DEFAULT FALSE,
        planned_start TIMESTAMP WITH TIME ZONE,
        planned_end TIMESTAMP WITH TIME ZONE,
        actual_start TIMESTAMP WITH TIME ZONE,
        actual_end TIMESTAMP WITH TIME ZONE,
        ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS change_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        change_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(30) DEFAULT 'Pending',
        sequence_order INTEGER DEFAULT 0,
        estimated_hours NUMERIC(6,2),
        actual_hours NUMERIC(6,2),
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS change_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        change_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
        approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'Pending',
        comments TEXT,
        approved_at TIMESTAMP WITH TIME ZONE,
        sequence_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS change_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        change_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_change_requests_requested_by ON change_requests(requested_by);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_change_approvals_change_id ON change_approvals(change_id);`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 15: Problem Management
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 15 problem management schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        problem_number VARCHAR(30) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'Open',
        priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
        category VARCHAR(100),
        root_cause TEXT,
        workaround TEXT,
        permanent_resolution TEXT,
        reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS known_errors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        workaround TEXT NOT NULL,
        affected_services TEXT,
        status VARCHAR(30) DEFAULT 'Active',
        published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS problem_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS incident_problem_mapping (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        linked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(problem_id, ticket_id)
      );
    `);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_problems_assigned_to ON problems(assigned_to);`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 16: Release Management
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 16 release management schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS releases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        release_number VARCHAR(30) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(50) NOT NULL,
        release_type VARCHAR(30) DEFAULT 'Minor',
        status VARCHAR(30) DEFAULT 'Planning',
        environment VARCHAR(50) DEFAULT 'Production',
        planned_date TIMESTAMP WITH TIME ZONE,
        actual_date TIMESTAMP WITH TIME ZONE,
        rollback_plan TEXT,
        release_notes TEXT,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS release_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(30) DEFAULT 'Pending',
        sequence_order INTEGER DEFAULT 0,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS release_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_releases_planned_date ON releases(planned_date);`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 17: CMDB
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 17 CMDB schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS configuration_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ci_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        type VARCHAR(50) NOT NULL,
        subtype VARCHAR(50),
        status VARCHAR(30) DEFAULT 'Active',
        environment VARCHAR(50) DEFAULT 'Production',
        version VARCHAR(50),
        description TEXT,
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        attributes JSONB DEFAULT '{}',
        ip_address VARCHAR(45),
        hostname VARCHAR(200),
        location VARCHAR(200),
        business_service VARCHAR(200),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ci_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
        target_ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
        relationship_type VARCHAR(50) NOT NULL DEFAULT 'depends_on',
        description TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_ci_id, target_ci_id, relationship_type)
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ci_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        old_value JSONB,
        new_value JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_ci_status ON configuration_items(status);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_ci_type ON configuration_items(type);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_ci_relationships_source ON ci_relationships(source_ci_id);`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 18: Workflow Automation
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 18 workflow automation schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) UNIQUE NOT NULL,
        description TEXT,
        trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
        trigger_conditions JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        category VARCHAR(50) DEFAULT 'General',
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        step_type VARCHAR(50) NOT NULL,
        step_name VARCHAR(100) NOT NULL,
        step_config JSONB DEFAULT '{}',
        sequence_order INTEGER DEFAULT 0,
        condition JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        status VARCHAR(30) DEFAULT 'Running',
        trigger_data JSONB,
        result JSONB,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        triggered_by UUID REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS workflow_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
        step_id UUID REFERENCES workflow_steps(id) ON DELETE SET NULL,
        level VARCHAR(20) DEFAULT 'info',
        message TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 19: Advanced AI Platform
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 19 AI platform schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'New Conversation',
        context JSONB DEFAULT '{}',
        provider VARCHAR(50) DEFAULT 'mock',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ai_conversation_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ai_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type VARCHAR(50) NOT NULL,
        source_id UUID NOT NULL,
        content TEXT NOT NULL,
        embedding_vector TEXT,
        model_used VARCHAR(100) DEFAULT 'mock',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS ai_performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(50) NOT NULL,
        operation VARCHAR(50) NOT NULL,
        latency_ms INTEGER,
        tokens_used INTEGER,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_conversation_messages(conversation_id);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_ai_embeddings_source ON ai_embeddings(source_type, source_id);`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 20: DevOps Integration
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 20 DevOps schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS devops_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        provider VARCHAR(50) NOT NULL,
        config JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS devops_pipelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        integration_id UUID NOT NULL REFERENCES devops_integrations(id) ON DELETE CASCADE,
        pipeline_name VARCHAR(200) NOT NULL,
        pipeline_id VARCHAR(200),
        repository VARCHAR(200),
        branch VARCHAR(100),
        status VARCHAR(30) DEFAULT 'Unknown',
        last_run_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS devops_deployments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pipeline_id UUID REFERENCES devops_pipelines(id) ON DELETE SET NULL,
        environment VARCHAR(50) NOT NULL,
        version VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'Pending',
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        deployed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        logs TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_devops_pipelines_status ON devops_pipelines(status);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_devops_deployments_status ON devops_deployments(status);`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 22: Enterprise Security
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 22 enterprise security schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS mfa_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        method VARCHAR(30) DEFAULT 'totp',
        secret VARCHAR(255),
        is_enabled BOOLEAN DEFAULT FALSE,
        backup_codes TEXT[],
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        ip_address VARCHAR(45),
        user_agent TEXT,
        request_method VARCHAR(10),
        request_path VARCHAR(500),
        status_code INTEGER,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_address VARCHAR(45),
        description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        is_resolved BOOLEAN DEFAULT FALSE,
        resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(500) UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Extend users table with security fields
    await targetClient.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;`);
    await targetClient.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;`);
    await targetClient.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;`);
    await targetClient.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);`);
    await targetClient.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
    await targetClient.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;`);
    await targetClient.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`);
    await targetClient.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);`);
    await targetClient.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);`);

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 23: Production Ready – System Monitoring
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Applying Phase 23 production readiness schema...');
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS system_health_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        component VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL,
        response_time_ms INTEGER,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS cache_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_pattern VARCHAR(200),
        hits INTEGER DEFAULT 0,
        misses INTEGER DEFAULT 0,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health_logs(component);`);
    await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_system_health_created_at ON system_health_logs(created_at);`);
    
    try {
        console.log('Applying Phases 24-40 Advanced AI schema...');
        
        await targetClient.query(`
            -- AI Models Registry (Phase 37: MLOps)
            CREATE TABLE IF NOT EXISTS ai_models (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                model_name VARCHAR(100) NOT NULL,
                model_type VARCHAR(50) NOT NULL,
                version VARCHAR(20) NOT NULL,
                is_active BOOLEAN DEFAULT false,
                metrics JSONB,
                file_path VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- AI Training Jobs (Phase 36: AutoML)
            CREATE TABLE IF NOT EXISTS ai_training_jobs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                model_type VARCHAR(50) NOT NULL,
                dataset_name VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Pending',
                mlflow_run_id VARCHAR(100),
                results JSONB,
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP WITH TIME ZONE
            );

            -- AI Prediction Logs (Phase 39: AI Monitoring & Drift Detection)
            CREATE TABLE IF NOT EXISTS ai_prediction_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
                prediction_type VARCHAR(50) NOT NULL,
                input_data JSONB NOT NULL,
                predicted_value VARCHAR(255) NOT NULL,
                actual_value VARCHAR(255),
                confidence NUMERIC(5,4),
                explanation JSONB,
                drift_detected BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- AI Model Metrics History
            CREATE TABLE IF NOT EXISTS ai_model_metrics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
                accuracy NUMERIC(5,4),
                precision NUMERIC(5,4),
                recall NUMERIC(5,4),
                f1_score NUMERIC(5,4),
                evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Phases 24-40 schema migrations completed successfully.');
    } catch (e) {
        console.log('Skipping Phase 24-40 data insertion:', e.message);
    }

    console.log('Tables and indexes created or already exist.');

    // Seed Roles
    console.log('Seeding default roles...');
    const rolesList = [
      {
        name: 'Admin',
        description: 'System Administrator with full access rights',
        permissions: ['users:read', 'users:write', 'roles:read', 'roles:write', 'tickets:read', 'tickets:write', 'tickets:delete', 'settings:read', 'settings:write', 'ai:analytics', 'ai:re-analyze'],
      },
      {
        name: 'Manager',
        description: 'Support Manager oversight',
        permissions: ['users:read', 'tickets:read', 'tickets:write', 'tickets:assign', 'analytics:read', 'ai:analytics', 'ai:re-analyze'],
      },
      {
        name: 'Team Lead',
        description: 'Support Team Lead',
        permissions: ['users:read', 'tickets:read', 'tickets:write', 'tickets:assign', 'analytics:read', 'ai:re-analyze'],
      },
      {
        name: 'Support Engineer',
        description: 'Support Engineer resolver',
        permissions: ['tickets:read', 'tickets:write', 'tickets:resolve'],
      },
      {
        name: 'Client',
        description: 'End customer submitting tickets',
        permissions: ['tickets:create', 'tickets:read', 'tickets:comment'],
      },
    ];


    const roleMap = {}; // name -> id

    for (const r of rolesList) {
      const existing = await targetClient.query(`SELECT id FROM roles WHERE name = $1`, [r.name]);
      if (existing.rowCount === 0) {
        const insertRes = await targetClient.query(
          `INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING id`,
          [r.name, r.description, r.permissions]
        );
        roleMap[r.name] = insertRes.rows[0].id;
        console.log(`Seeded role: ${r.name}`);
      } else {
        roleMap[r.name] = existing.rows[0].id;
        // Optionally update permissions
        await targetClient.query(`UPDATE roles SET permissions = $1 WHERE id = $2`, [r.permissions, roleMap[r.name]]);
        console.log(`Updated role permissions for: ${r.name}`);
      }
    }

    // Seed Default Admin User
    console.log('Seeding default admin user...');
    const adminEmail = 'admin@desk.com';
    const adminUser = await targetClient.query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);

    if (adminUser.rowCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('adminpassword', salt);
      const adminRoleId = roleMap['Admin'];

      await targetClient.query(
        `INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, $5)`,
        ['Administrator', adminEmail, passwordHash, adminRoleId, true]
      );
      console.log(`Admin user seeded. Login email: "${adminEmail}", Password: "adminpassword"`);
    } else {
      console.log('Admin user already exists.');
    }

    // Seed SLA Policies
    console.log('Seeding default SLA policies...');
    const defaultSlas = [
      { priority: 'Critical', response_time: 15, resolution_time: 120 }, // 2 hours
      { priority: 'High', response_time: 60, resolution_time: 480 }, // 8 hours
      { priority: 'Medium', response_time: 240, resolution_time: 1440 }, // 24 hours
      { priority: 'Low', response_time: 1440, resolution_time: 4320 } // 72 hours
    ];

    for (const sla of defaultSlas) {
      const existingSla = await targetClient.query(`SELECT id FROM sla_policies WHERE priority = $1`, [sla.priority]);
      if (existingSla.rowCount === 0) {
        await targetClient.query(
          `INSERT INTO sla_policies (priority, response_time_minutes, resolution_time_minutes) VALUES ($1, $2, $3)`,
          [sla.priority, sla.response_time, sla.resolution_time]
        );
        console.log(`Seeded SLA policy for priority: ${sla.priority}`);
      }
    }

    // Seed Categories
    console.log('Seeding default categories...');
    const defaultCategories = [
      { name: 'Hardware Support', description: 'Computers, laptops, monitors, keyboard, printer issues', color: '#EF4444', icon: 'Laptop' },
      { name: 'Software Issues', description: 'Operating system, IDEs, software licenses, application bugs', color: '#3B82F6', icon: 'Code' },
      { name: 'Network & Internet', description: 'WiFi connectivity, VPN access, firewall, ethernet issues', color: '#10B981', icon: 'Wifi' },
      { name: 'Account & Access', description: 'Password reset, MFA configuration, SSO permissions, new accounts', color: '#F59E0B', icon: 'Key' },
      { name: 'General Request', description: 'General questions, hardware requests, onboarding inquiries', color: '#6B7280', icon: 'HelpCircle' }
    ];

    for (const cat of defaultCategories) {
      const existingCat = await targetClient.query(`SELECT id FROM ticket_categories WHERE name = $1`, [cat.name]);
      if (existingCat.rowCount === 0) {
        await targetClient.query(
          `INSERT INTO ticket_categories (name, description, color, icon) VALUES ($1, $2, $3, $4)`,
          [cat.name, cat.description, cat.color, cat.icon]
        );
        console.log(`Seeded category: ${cat.name}`);
      }
    }

    // Seed Knowledge Base Articles
    console.log('Seeding knowledge base articles...');
    const kbArticles = [
      {
        title: 'Cannot Connect to Office WiFi',
        problem: 'Laptop unable to connect to office WiFi network',
        solution: '1. Restart your router and modem\n2. Forget the network and reconnect\n3. Check network adapter settings\n4. Flush DNS: run ipconfig /flushdns\n5. Renew IP: run ipconfig /release then ipconfig /renew\n6. Update wireless driver\n7. Check if WiFi is disabled in BIOS',
        keywords: ['wifi', 'wireless', 'network', 'internet', 'connect', 'connection', 'router', 'adapter'],
        category: 'Network & Internet'
      },
      {
        title: 'Laptop Not Turning On',
        problem: 'Laptop powers off or does not start at all',
        solution: '1. Check power adapter connection\n2. Hold power button 10 seconds to force reset\n3. Remove battery and reconnect\n4. Check RAM seating\n5. Try external monitor to rule out display issue\n6. Boot in safe mode\n7. Contact hardware support if persists',
        keywords: ['laptop', 'power', 'boot', 'startup', 'hardware', 'not starting', 'black screen'],
        category: 'Hardware Support'
      },
      {
        title: 'Password Reset Required',
        problem: 'User forgot password or account is locked',
        solution: '1. Use the Forgot Password link on login page\n2. Check your registered email for reset link\n3. If account locked, contact IT admin\n4. Reset via Active Directory if domain-joined\n5. Enable MFA after reset for security',
        keywords: ['password', 'reset', 'forgot', 'locked', 'account', 'login', 'access', 'credentials'],
        category: 'Account & Access'
      },
      {
        title: 'Software Application Crashing',
        problem: 'Application crashes or freezes unexpectedly',
        solution: '1. Update the application to latest version\n2. Clear application cache and temp files\n3. Run as administrator\n4. Check for conflicting software\n5. Reinstall the application\n6. Check system logs in Event Viewer\n7. Verify system meets application requirements',
        keywords: ['software', 'application', 'crash', 'freeze', 'error', 'bug', 'install', 'app'],
        category: 'Software Issues'
      },
      {
        title: 'VPN Connection Issues',
        problem: 'Cannot establish VPN connection to corporate network',
        solution: '1. Check internet connectivity first\n2. Verify VPN credentials\n3. Restart VPN client application\n4. Check firewall and antivirus settings\n5. Try alternative VPN server\n6. Update VPN client software\n7. Contact IT for certificate renewal if expired',
        keywords: ['vpn', 'remote', 'network', 'connect', 'tunnel', 'firewall', 'corporate', 'access'],
        category: 'Network & Internet'
      },
      {
        title: 'Printer Not Working',
        problem: 'Unable to print documents from workstation',
        solution: '1. Check printer power and connection cables\n2. Verify printer is set as default\n3. Clear print queue\n4. Restart print spooler service\n5. Reinstall printer drivers\n6. Check ink/toner levels\n7. Try printing a test page from printer settings',
        keywords: ['printer', 'print', 'driver', 'hardware', 'queue', 'spooler', 'ink', 'toner'],
        category: 'Hardware Support'
      },
      {
        title: 'Slow Computer Performance',
        problem: 'Computer running very slowly and taking long time to respond',
        solution: '1. Check Task Manager for high CPU/RAM usage\n2. Disable startup programs\n3. Run disk cleanup and defragmentation\n4. Scan for malware and viruses\n5. Upgrade RAM if below 8GB\n6. Check for Windows updates\n7. Clear browser cache and temporary files',
        keywords: ['slow', 'performance', 'lag', 'freeze', 'cpu', 'memory', 'ram', 'speed'],
        category: 'Hardware Support'
      },
      {
        title: 'Email Not Receiving Messages',
        problem: 'Not receiving emails or emails going to spam',
        solution: '1. Check spam/junk folder\n2. Verify email rules and filters\n3. Check mailbox storage quota\n4. Whitelist sender domain\n5. Check email server settings\n6. Re-configure email account in client\n7. Contact email administrator for server-side issues',
        keywords: ['email', 'mail', 'receive', 'spam', 'inbox', 'outlook', 'gmail', 'messages'],
        category: 'Software Issues'
      }
    ];

    for (const article of kbArticles) {
      const existingArticle = await targetClient.query(
        `SELECT id FROM knowledge_base WHERE title = $1`, [article.title]
      );
      if (existingArticle.rowCount === 0) {
        await targetClient.query(
          `INSERT INTO knowledge_base (title, problem, solution, keywords, category) VALUES ($1, $2, $3, $4, $5)`,
          [article.title, article.problem, article.solution, article.keywords, article.category]
        );
        console.log(`Seeded KB article: ${article.title}`);
      }
    }

    console.log('Database Initialization Completed Successfully.');
  } catch (err) {
    console.error('Error during database seeding/migrations:', err.stack);
    process.exit(1);
  } finally {
    await targetClient.end();
  }
}

initDb();
