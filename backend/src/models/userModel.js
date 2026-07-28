const db = require('../config/db');
const crypto = require('crypto');

const UserModel = {
  async findByEmail(email) {
    const cleanedEmail = email.toLowerCase().trim();
    if (db.isMock()) {
      const data = db.getMockData();
      const user = data.users.find(u => u.email.toLowerCase() === cleanedEmail && !u.deleted_at);
      if (!user) return null;
      const role = data.roles.find(r => r.id === user.role_id);
      return {
        ...user,
        role_name: role ? role.name : 'Client',
        permissions: role ? role.permissions : []
      };
    }
    const query = `
      SELECT u.*, r.name as role_name, r.permissions 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1 AND u.deleted_at IS NULL
    `;
    const { rows } = await db.query(query, [cleanedEmail]);
    return rows[0] || null;
  },

  async findById(id) {
    if (db.isMock()) {
      const data = db.getMockData();
      const user = data.users.find(u => u.id === id && !u.deleted_at);
      if (!user) return null;
      const role = data.roles.find(r => r.id === user.role_id);
      return {
        ...user,
        role_name: role ? role.name : 'Client',
        permissions: role ? role.permissions : []
      };
    }
    const query = `
      SELECT u.id, u.name, u.email, u.role_id, u.is_active, u.status, u.created_at, u.updated_at,
             r.name as role_name, r.permissions
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  },

  async create({ name, email, passwordHash, roleId, status = 'Active' }) {
    if (db.isMock()) {
      const data = db.getMockData();
      const newUser = {
        id: `user-${crypto.randomBytes(8).toString('hex')}`,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        role_id: roleId,
        is_active: status === 'Active',
        status: status,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      data.users.push(newUser);
      db.saveMockData(data);
      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role_id: newUser.role_id,
        is_active: newUser.is_active,
        status: newUser.status,
        created_at: newUser.created_at
      };
    }
    const query = `
      INSERT INTO users (name, email, password_hash, role_id, is_active, status, deleted_at)
      VALUES ($1, $2, $3, $4, $5, $6, NULL)
      RETURNING id, name, email, role_id, is_active, status, created_at
    `;
    const { rows } = await db.query(query, [
      name.trim(),
      email.toLowerCase().trim(),
      passwordHash,
      roleId,
      status === 'Active',
      status
    ]);
    return rows[0];
  },

  async update(id, { name, email, roleId, status }) {
    if (db.isMock()) {
      const data = db.getMockData();
      const userIdx = data.users.findIndex(u => u.id === id);
      if (userIdx === -1) return null;
      data.users[userIdx].name = name.trim();
      data.users[userIdx].email = email.toLowerCase().trim();
      data.users[userIdx].role_id = roleId;
      data.users[userIdx].status = status;
      data.users[userIdx].is_active = status === 'Active';
      data.users[userIdx].updated_at = new Date().toISOString();
      db.saveMockData(data);
      return {
        id: data.users[userIdx].id,
        name: data.users[userIdx].name,
        email: data.users[userIdx].email,
        role_id: data.users[userIdx].role_id,
        is_active: data.users[userIdx].is_active,
        status: data.users[userIdx].status,
        updated_at: data.users[userIdx].updated_at
      };
    }
    const query = `
      UPDATE users
      SET name = $1, email = $2, role_id = $3, status = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND deleted_at IS NULL
      RETURNING id, name, email, role_id, is_active, status, updated_at
    `;
    const { rows } = await db.query(query, [
      name.trim(),
      email.toLowerCase().trim(),
      roleId,
      status,
      status === 'Active',
      id
    ]);
    return rows[0] || null;
  },

  async updateStatus(id, status) {
    if (db.isMock()) {
      const data = db.getMockData();
      const userIdx = data.users.findIndex(u => u.id === id && !u.deleted_at);
      if (userIdx === -1) return null;
      data.users[userIdx].status = status;
      data.users[userIdx].is_active = status === 'Active';
      data.users[userIdx].updated_at = new Date().toISOString();
      db.saveMockData(data);
      return {
        id: data.users[userIdx].id,
        name: data.users[userIdx].name,
        email: data.users[userIdx].email,
        role_id: data.users[userIdx].role_id,
        is_active: data.users[userIdx].is_active,
        status: data.users[userIdx].status,
        updated_at: data.users[userIdx].updated_at
      };
    }
    const query = `
      UPDATE users
      SET status = $1, is_active = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING id, name, email, role_id, is_active, status, updated_at
    `;
    const { rows } = await db.query(query, [status, status === 'Active', id]);
    return rows[0] || null;
  },

  async delete(id) {
    if (db.isMock()) {
      const data = db.getMockData();
      const userIdx = data.users.findIndex(u => u.id === id && !u.deleted_at);
      if (userIdx === -1) return null;
      
      const user = data.users[userIdx];
      user.deleted_at = new Date().toISOString();
      user.is_active = false;
      user.status = 'Inactive';
      user.email = `${user.email}.deleted_${Date.now()}`;
      user.updated_at = new Date().toISOString();
      
      // Clean tokens
      data.refresh_tokens = data.refresh_tokens.filter(t => t.user_id !== id);
      data.password_resets = data.password_resets.filter(r => r.user_id !== id);
      db.saveMockData(data);
      return { id };
    }
    const query = `
      UPDATE users 
      SET deleted_at = CURRENT_TIMESTAMP, 
          is_active = FALSE,
          status = 'Inactive',
          email = email || '.deleted_' || extract(epoch from now())
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  },

  async getAll({ search = '', roleId = '', status = '', sortBy = 'created_at', sortOrder = 'DESC', page = 1, limit = 10 }) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    
    if (db.isMock()) {
      const data = db.getMockData();
      let filtered = data.users.filter(u => !u.deleted_at);

      if (search) {
        const term = search.toLowerCase().trim();
        filtered = filtered.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
      }

      if (roleId) {
        filtered = filtered.filter(u => u.role_id === roleId);
      }

      if (status) {
        filtered = filtered.filter(u => (u.status || 'Active') === status);
      }

      const total = filtered.length;

      // Sorting
      const orderMultiplier = sortOrder.toUpperCase() === 'ASC' ? 1 : -1;
      filtered.sort((a, b) => {
        let fieldA, fieldB;
        if (sortBy === 'role') {
          const rA = data.roles.find(r => r.id === a.role_id);
          const rB = data.roles.find(r => r.id === b.role_id);
          fieldA = rA ? rA.name.toLowerCase() : '';
          fieldB = rB ? rB.name.toLowerCase() : '';
        } else if (sortBy === 'name') {
          fieldA = a.name.toLowerCase();
          fieldB = b.name.toLowerCase();
        } else if (sortBy === 'email') {
          fieldA = a.email.toLowerCase();
          fieldB = b.email.toLowerCase();
        } else if (sortBy === 'status') {
          fieldA = (a.status || 'Active').toLowerCase();
          fieldB = (b.status || 'Active').toLowerCase();
        } else {
          // Default: created_at
          fieldA = new Date(a.created_at || 0).getTime();
          fieldB = new Date(b.created_at || 0).getTime();
          return (fieldA - fieldB) * orderMultiplier;
        }
        if (fieldA < fieldB) return -1 * orderMultiplier;
        if (fieldA > fieldB) return 1 * orderMultiplier;
        return 0;
      });

      // Pagination
      const offset = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(offset, offset + limitNum);

      // Join role name
      const usersMapped = paginated.map(u => {
        const role = data.roles.find(r => r.id === u.role_id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role_id: u.role_id,
          is_active: u.is_active,
          status: u.status || 'Active',
          created_at: u.created_at,
          updated_at: u.updated_at,
          role_name: role ? role.name : 'Client'
        };
      });

      return { users: usersMapped, total };
    }
    
    // PostgreSQL Implementation
    let countQuery = `
      SELECT COUNT(*) as count 
      FROM users u 
      WHERE u.deleted_at IS NULL
    `;
    let dataQuery = `
      SELECT u.id, u.name, u.email, u.role_id, u.is_active, u.status, u.created_at, u.updated_at,
             r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.deleted_at IS NULL
    `;
    
    let whereClause = '';
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    if (roleId) {
      params.push(roleId);
      whereClause += ` AND u.role_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND u.status = $${params.length}`;
    }

    // Run Count query
    const countRes = await db.query(countQuery + whereClause, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Sorting
    const allowedSortFields = {
      name: 'u.name',
      email: 'u.email',
      role: 'r.name',
      status: 'u.status',
      created_at: 'u.created_at'
    };
    const sortColumn = allowedSortFields[sortBy] || 'u.created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    dataQuery += whereClause + ` ORDER BY ${sortColumn} ${order}`;

    // Pagination
    const offset = (pageNum - 1) * limitNum;
    params.push(limitNum);
    dataQuery += ` LIMIT $${params.length}`;
    params.push(offset);
    dataQuery += ` OFFSET $${params.length}`;

    // Run Data query
    const { rows } = await db.query(dataQuery, params);
    return { users: rows, total };
  }
};

module.exports = UserModel;
