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

module.exports = router;
