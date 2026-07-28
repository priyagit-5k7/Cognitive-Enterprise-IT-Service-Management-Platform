const express = require('express');
const router = express.Router();
const kbController = require('../controllers/knowledgeController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', kbController.getAll);
router.get('/search', kbController.search);
router.get('/categories', kbController.getCategories);
router.get('/:id', kbController.getById);
router.post('/', kbController.create);
router.put('/:id', kbController.update);
router.post('/:id/approve', kbController.approve);
router.delete('/:id', kbController.remove);

module.exports = router;
