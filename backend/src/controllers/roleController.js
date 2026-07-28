const RoleModel = require('../models/roleModel');

const SYSTEM_ROLES = ['Admin', 'Manager', 'Team Lead', 'Support Engineer', 'Client'];

const RoleController = {
  async getAllRoles(req, res) {
    try {
      const roles = await RoleModel.getAll();
      res.json(roles);
    } catch (err) {
      console.error('Get all roles error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getRoleById(req, res) {
    try {
      const { id } = req.params;
      const role = await RoleModel.findById(id);
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }
      res.json(role);
    } catch (err) {
      console.error('Get role by ID error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async createRole(req, res) {
    try {
      const { name, description, permissions } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Role name is required' });
      }

      if (SYSTEM_ROLES.some(r => r.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ message: `Cannot create a role with system name: "${name}"` });
      }

      // Check if role name already exists
      const existing = await RoleModel.findByName(name);
      if (existing) {
        return res.status(400).json({ message: 'A role with this name already exists' });
      }

      const newRole = await RoleModel.create({
        name,
        description,
        permissions: permissions || []
      });

      res.status(201).json({
        message: 'Role created successfully',
        role: newRole
      });
    } catch (err) {
      console.error('Create role error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, description, permissions } = req.body;

      const role = await RoleModel.findById(id);
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // If it's a system role
      const isSystemRole = SYSTEM_ROLES.includes(role.name);

      let finalName = role.name;
      if (name && name.toLowerCase() !== role.name.toLowerCase()) {
        if (isSystemRole) {
          return res.status(400).json({ message: 'System role names cannot be modified.' });
        }

        // Check if name is taken by another role
        const existing = await RoleModel.findByName(name);
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: 'A role with this name already exists.' });
        }
        finalName = name;
      }

      // Permissions check
      let finalPermissions = permissions;
      if (permissions && Array.isArray(permissions)) {
        // Safeguard: Do not allow removing Admin's core settings to prevent lockdown
        if (role.name === 'Admin' && !permissions.includes('roles:write')) {
          return res.status(400).json({ message: 'Cannot remove administrative permissions from the Admin role.' });
        }
      } else {
        finalPermissions = role.permissions;
      }

      const updatedRole = await RoleModel.update(id, {
        name: finalName,
        description: description !== undefined ? description : role.description,
        permissions: finalPermissions
      });

      res.json({
        message: 'Role updated successfully',
        role: updatedRole
      });
    } catch (err) {
      console.error('Update role error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async updateRolePermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ message: 'Permissions array is required' });
      }

      const role = await RoleModel.findById(id);
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // Safeguard: Do not allow removing Admin's core settings to prevent lockdown
      if (role.name === 'Admin' && !permissions.includes('roles:write')) {
        return res.status(400).json({ message: 'Cannot remove administrative permissions from the Admin role.' });
      }

      const updatedRole = await RoleModel.updatePermissions(id, permissions);
      res.json({
        message: 'Role permissions updated successfully',
        role: updatedRole
      });
    } catch (err) {
      console.error('Update role permissions error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async deleteRole(req, res) {
    try {
      const { id } = req.params;

      const role = await RoleModel.findById(id);
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // Block deleting system roles
      if (SYSTEM_ROLES.includes(role.name)) {
        return res.status(400).json({ message: 'System roles cannot be deleted.' });
      }

      // Check if any active user is using this role
      const isAssigned = await RoleModel.hasAssociatedUsers(id);
      if (isAssigned) {
        return res.status(400).json({ message: 'Cannot delete role because it is currently assigned to one or more active users.' });
      }

      await RoleModel.delete(id);
      res.json({ message: 'Role deleted successfully' });
    } catch (err) {
      console.error('Delete role error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

module.exports = RoleController;
