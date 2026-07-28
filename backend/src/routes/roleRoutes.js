const express = require('express');
const RoleController = require('../controllers/roleController');
const authenticate = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/rbacMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', checkPermission('roles:read'), RoleController.getAllRoles);
router.get('/:id', checkPermission('roles:read'), RoleController.getRoleById);
router.post('/', checkPermission('roles:write'), RoleController.createRole);
router.put('/:id', checkPermission('roles:write'), RoleController.updateRole);
router.delete('/:id', checkPermission('roles:write'), RoleController.deleteRole);

module.exports = router;
