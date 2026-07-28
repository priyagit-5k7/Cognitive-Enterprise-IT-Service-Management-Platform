const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const securityController = require('../controllers/securityController');

router.use(authenticate);

// Dashboard
router.get('/stats', securityController.getSecurityStats);

// MFA
router.get('/mfa/status', securityController.getMfaStatus);
router.post('/mfa/setup', securityController.setupMfa);
router.post('/mfa/enable', securityController.enableMfa);
router.post('/mfa/disable', securityController.disableMfa);

// Audit logs (Admin only)
router.get('/audit-logs', securityController.getAuditLogs);

// Security events (Admin only)
router.get('/events', securityController.getSecurityEvents);
router.post('/events/:id/resolve', securityController.resolveSecurityEvent);

// Sessions
router.get('/sessions', securityController.getActiveSessions);
router.delete('/sessions/:sessionId', securityController.revokeSession);

// Password policy
router.get('/password-policy', securityController.getPasswordPolicy);
router.put('/password-policy', securityController.updatePasswordPolicy);

module.exports = router;
