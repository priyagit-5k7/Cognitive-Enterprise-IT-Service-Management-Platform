const express = require('express');
const router = express.Router();
const slaController = require('../controllers/slaController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/rbacMiddleware');

router.use(authMiddleware);

// Only Admins can manage SLA Policies (assuming 'manage_settings' or 'manage_roles' is an admin-level permission, or we can use manage_users for now)
router.get('/', requirePermission('manage_users'), slaController.getPolicies);
router.put('/:id', requirePermission('manage_users'), slaController.updatePolicy);

module.exports = router;
