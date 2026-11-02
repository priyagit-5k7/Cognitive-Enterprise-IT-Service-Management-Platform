const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const aiPlatformController = require('../controllers/aiPlatformController');

router.use(authenticate);

// Provider info
router.get('/provider', aiPlatformController.getProviderInfo);
// Status alias (same as provider info)
router.get('/status', aiPlatformController.getProviderInfo);

// Conversations
router.get('/conversations', aiPlatformController.getConversations);
router.post('/conversations', aiPlatformController.createConversation);
router.delete('/conversations/:conversationId', aiPlatformController.deleteConversation);
router.get('/conversations/:conversationId/messages', aiPlatformController.getMessages);
router.post('/conversations/:conversationId/messages', aiPlatformController.sendMessage);

// Ticket intelligence
router.get('/tickets/:ticketId/summarize', aiPlatformController.summarizeTicket);
router.get('/tickets/:ticketId/suggest-resolution', aiPlatformController.suggestResolution);

// Problem analysis
router.get('/problems/:problemId/root-cause', aiPlatformController.analyzeRootCause);

// Knowledge search
router.get('/knowledge-search', aiPlatformController.knowledgeSearch);

// Performance dashboard
router.get('/performance', aiPlatformController.getPerformanceMetrics);

module.exports = router;
