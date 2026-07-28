const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', searchController.globalSearch);
router.get('/suggestions', searchController.getSuggestions);
router.get('/recent', searchController.getRecentSearches);
router.get('/saved', searchController.getSavedSearches);
router.post('/saved', searchController.saveSearch);
router.delete('/saved/:id', searchController.deleteSavedSearch);

module.exports = router;
