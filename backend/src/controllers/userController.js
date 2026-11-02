const UserModel = require('../models/userModel');
const RoleModel = require('../models/roleModel');
const bcrypt = require('bcryptjs');

const UserController = {
  async getAllUsers(req, res) {
    try {
      const { search, roleId, status, sortBy, sortOrder, page, limit } = req.query;
      
      const result = await UserModel.getAll({
        search,
        roleId,
        status,
        sortBy,
        sortOrder,
        page,
        limit
      });

      res.json({
        users: result.users,
        pagination: {
          total: result.total,
          page: parseInt(page, 10) || 1,
          limit: parseInt(limit, 10) || 10,
          pages: Math.ceil(result.total / (parseInt(limit, 10) || 10))
        }
      });
    } catch (err) {
      console.error('Get all users error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (err) {
      console.error('Get user by ID error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async createUser(req, res) {
    try {
      const { name, email, password, roleId, status = 'Active', specialization, department } = req.body;

      if (!name || !email || !password || !roleId) {
        return res.status(400).json({ message: 'All fields (name, email, password, roleId) are required' });
      }

      // Check if email already taken
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use' });
      }

      // Verify role exists
      const role = await RoleModel.findById(roleId);
      if (!role) {
        return res.status(400).json({ message: 'Invalid role ID' });
      }

      // Privilege Escalation Check: Only Admins can assign the Admin role
      if (role.name === 'Admin' && req.user.role_name !== 'Admin') {
        return res.status(403).json({ message: 'Privilege Escalation: Only administrators can assign the Admin role.' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await UserModel.create({
        name,
        email,
        passwordHash,
        roleId,
        status,
        specialization: specialization || null,
        department: department || null
      });

      res.status(201).json({
        message: 'User created successfully',
        user: newUser,
      });
    } catch (err) {
      console.error('Create user error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, roleId, status, specialization, department } = req.body;

      if (!name || !email || !roleId || !status) {
        return res.status(400).json({ message: 'All fields (name, email, roleId, status) are required' });
      }

      // Check if user exists
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if email is used by another user
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ message: 'Email is already in use by another account' });
      }

      // Check if role is valid
      const role = await RoleModel.findById(roleId);
      if (!role) {
        return res.status(400).json({ message: 'Invalid role ID' });
      }

      // Privilege Escalation Check: Only Admins can set Admin role
      if (role.name === 'Admin' && req.user.role_name !== 'Admin' && user.role_name !== 'Admin') {
        return res.status(403).json({ message: 'Privilege Escalation: Only administrators can assign the Admin role.' });
      }

      // Prevent Admin from deactivating themselves or changing their own role
      if (req.user.id === id) {
        if (status !== 'Active') {
          return res.status(400).json({ message: 'Administrators cannot deactivate or suspend their own accounts.' });
        }
        if (role.name !== 'Admin') {
          return res.status(400).json({ message: 'Administrators cannot change their own roles.' });
        }
      }

      const updatedUser = await UserModel.update(id, {
        name,
        email,
        roleId,
        status,
        specialization: specialization !== undefined ? specialization : user.specialization,
        department: department !== undefined ? department : user.department
      });

      res.json({
        message: 'User updated successfully',
        user: updatedUser,
      });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['Active', 'Suspended', 'Inactive'].includes(status)) {
        return res.status(400).json({ message: 'Valid status (Active, Suspended, Inactive) is required' });
      }

      // Check if user exists
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent self deactivation or suspension
      if (req.user.id === id && status !== 'Active') {
        return res.status(400).json({ message: 'You cannot suspend or deactivate your own account.' });
      }

      const updatedUser = await UserModel.updateStatus(id, status);
      res.json({
        message: `User status updated to ${status} successfully`,
        user: updatedUser
      });
    } catch (err) {
      console.error('Update user status error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      if (req.user.id === id) {
        return res.status(400).json({ message: 'You cannot delete your own account.' });
      }

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent deleting other Admin accounts if requester is not an Admin
      if (user.role_name === 'Admin' && req.user.role_name !== 'Admin') {
        return res.status(403).json({ message: 'Forbidden: Only administrators can delete Admin accounts.' });
      }

      await UserModel.delete(id);
      res.json({ message: 'User soft-deleted successfully' });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = UserController;
