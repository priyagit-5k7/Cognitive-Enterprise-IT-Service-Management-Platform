const db = require('../config/db');
const crypto = require('crypto');

const RoleModel = {
  async getAll() {
    if (db.isMock()) {
      const data = db.getMockData();
      return data.roles;
    }
    const query = 'SELECT * FROM roles ORDER BY name ASC';
    const { rows } = await db.query(query);
    return rows;
  },

  async findById(id) {
    if (db.isMock()) {
      const data = db.getMockData();
      return data.roles.find(r => r.id === id) || null;
    }
    const query = 'SELECT * FROM roles WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  },

  async findByName(name) {
    if (db.isMock()) {
      const data = db.getMockData();
      return data.roles.find(r => r.name.toLowerCase() === name.toLowerCase()) || null;
    }
    const query = 'SELECT * FROM roles WHERE name = $1';
    const { rows } = await db.query(query, [name]);
    return rows[0] || null;
  },

  async create({ name, description, permissions = [] }) {
    if (db.isMock()) {
      const data = db.getMockData();
      const newRole = {
        id: `role-${crypto.randomBytes(8).toString('hex')}`,
        name: name.trim(),
        description: description ? description.trim() : '',
        permissions: permissions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      data.roles.push(newRole);
      db.saveMockData(data);
      return newRole;
    }
    const query = `
      INSERT INTO roles (name, description, permissions)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const { rows } = await db.query(query, [
      name.trim(),
      description ? description.trim() : '',
      permissions
    ]);
    return rows[0];
  },

  async update(id, { name, description, permissions }) {
    if (db.isMock()) {
      const data = db.getMockData();
      const roleIdx = data.roles.findIndex(r => r.id === id);
      if (roleIdx === -1) return null;
      
      data.roles[roleIdx].name = name.trim();
      data.roles[roleIdx].description = description ? description.trim() : '';
      if (permissions) {
        data.roles[roleIdx].permissions = permissions;
      }
      data.roles[roleIdx].updated_at = new Date().toISOString();
      db.saveMockData(data);
      return data.roles[roleIdx];
    }
    const query = `
      UPDATE roles 
      SET name = $1, description = $2, permissions = $3, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $4 
      RETURNING *
    `;
    const { rows } = await db.query(query, [
      name.trim(),
      description ? description.trim() : '',
      permissions,
      id
    ]);
    return rows[0] || null;
  },

  async updatePermissions(id, permissions) {
    if (db.isMock()) {
      const data = db.getMockData();
      const roleIdx = data.roles.findIndex(r => r.id === id);
      if (roleIdx === -1) return null;
      data.roles[roleIdx].permissions = permissions;
      data.roles[roleIdx].updated_at = new Date().toISOString();
      db.saveMockData(data);
      return data.roles[roleIdx];
    }
    const query = `
      UPDATE roles 
      SET permissions = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    const { rows } = await db.query(query, [permissions, id]);
    return rows[0] || null;
  },

  async delete(id) {
    if (db.isMock()) {
      const data = db.getMockData();
      const exists = data.roles.some(r => r.id === id);
      if (!exists) return null;
      data.roles = data.roles.filter(r => r.id !== id);
      db.saveMockData(data);
      return { id };
    }
    const query = 'DELETE FROM roles WHERE id = $1 RETURNING id';
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  },

  // Check if any active user is using this role ID
  async hasAssociatedUsers(roleId) {
    if (db.isMock()) {
      const data = db.getMockData();
      return data.users.some(u => u.role_id === roleId && !u.deleted_at);
    }
    const query = 'SELECT 1 FROM users WHERE role_id = $1 AND deleted_at IS NULL LIMIT 1';
    const { rows } = await db.query(query, [roleId]);
    return rows.length > 0;
  }
};

module.exports = RoleModel;
