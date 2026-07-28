const express = require('express');
const UserController = require('../controllers/userController');
const authenticate = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/rbacMiddleware');

const router = express.Router();

// Apply auth to all routes in this router
router.use(authenticate);

router.get('/', checkPermission('users:read'), UserController.getAllUsers);
router.get('/:id', checkPermission('users:read'), UserController.getUserById);
router.post('/', checkPermission('users:write'), UserController.createUser);
router.put('/:id', checkPermission('users:write'), UserController.updateUser);
router.patch('/:id/status', checkPermission('users:write'), UserController.updateUserStatus);
router.delete('/:id', checkPermission('users:write'), UserController.deleteUser);

module.exports = router;
