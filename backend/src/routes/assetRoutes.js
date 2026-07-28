const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/rbacMiddleware');
const assetController = require('../controllers/assetController');

router.use(authenticate);

// Stats & Meta
router.get('/stats', assetController.getStats);
router.get('/categories', assetController.getCategories);

// Vendors
router.get('/vendors', assetController.getVendors);
router.post('/vendors', checkPermission('assets:write'), assetController.createVendor);
router.put('/vendors/:id', checkPermission('assets:write'), assetController.updateVendor);

// Asset CRUD
router.get('/', assetController.getAll);
router.post('/', checkPermission('assets:write'), assetController.create);
router.get('/:id', assetController.getById);
router.put('/:id', checkPermission('assets:write'), assetController.update);

// Assignment & Return
router.post('/:id/assign', checkPermission('assets:write'), assetController.assign);
router.post('/:id/return', checkPermission('assets:write'), assetController.returnAsset);

// History & Assignments
router.get('/:id/history', assetController.getHistory);
router.get('/:id/assignments', assetController.getAssignments);

module.exports = router;
