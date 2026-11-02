/**
 * aiRoutes.js
 * Routes for the AI Ticket Intelligence Module.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const authenticateToken = authenticate; // alias for backward compat
const { requirePermission } = require('../middlewares/rbacMiddleware');
const {
  getTicketPrediction,
  reAnalyzeTicketById,
  getAnalytics,
  getKnowledgeBase,
  getKnowledgeBaseArticle,
  chatbot
} = require('../controllers/aiController');
const { classifyTicket } = require('../ai/classificationService');
const { recommendEngineer } = require('../ai/engineerRecommendationService');

// ─── Chatbot (All authenticated users) ─────────────────────────────────────
router.post('/chatbot', authenticateToken, chatbot);

// ─── Knowledge Base (All authenticated users) ───────────────────────────────
router.get('/knowledge-base', authenticateToken, getKnowledgeBase);
router.get('/knowledge-base/:id', authenticateToken, getKnowledgeBaseArticle);

// ─── AI Analytics (Admin, Manager) ─────────────────────────────────────────
router.get('/analytics', authenticateToken, requirePermission('ai:analytics'), getAnalytics);

// ─── Ticket AI Predictions (Auth users — controller handles per-user access) ─
router.get('/tickets/:id/prediction', authenticateToken, getTicketPrediction);

// ─── Re-analyze Ticket (Admin, Manager, Team Lead) ─────────────────────────
router.post(
  '/tickets/:id/re-analyze',
  authenticateToken,
  requirePermission('ai:re-analyze'),
  reAnalyzeTicketById
);

// ─── Classify Ticket (inline: category + priority prediction) ───────────────
router.post('/classify', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }
    const result = classifyTicket(title, description || '');
    return res.json(result);
  } catch (err) {
    console.error('Classify error:', err.message);
    return res.status(500).json({ message: 'Classification failed' });
  }
});

// ─── Recommend Engineer ──────────────────────────────────────────────────────
router.post('/recommend-engineer', authenticateToken, async (req, res) => {
  try {
    const { category, ticketId } = req.body;
    const result = await recommendEngineer(category || 'General Request', req.user.id);
    return res.json(result);
  } catch (err) {
    console.error('Engineer recommendation error:', err.message);
    return res.status(500).json({ message: 'Engineer recommendation failed' });
  }
});

module.exports = router;
