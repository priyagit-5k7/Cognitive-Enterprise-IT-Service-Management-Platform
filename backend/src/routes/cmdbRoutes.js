const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const cmdbController = require('../controllers/cmdbController');

router.use(authenticate);

router.get('/stats', cmdbController.getStats);
router.get('/', cmdbController.getAll);
router.post('/', cmdbController.create);
router.get('/:id', cmdbController.getById);
router.put('/:id', cmdbController.update);
router.post('/:id/relationships', cmdbController.addRelationship);
router.delete('/:id/relationships/:relId', cmdbController.removeRelationship);
router.get('/:id/impact', cmdbController.getImpactAnalysis);

module.exports = router;
