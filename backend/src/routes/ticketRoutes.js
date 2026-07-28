const express = require('express');
const TicketController = require('../controllers/ticketController');
const authenticate = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/rbacMiddleware');

const router = express.Router();

// All ticket routes require authentication
router.use(authenticate);

// List tickets and view single ticket details
router.get('/', checkPermission('tickets:read'), TicketController.getAllTickets);
router.get('/:id', checkPermission('tickets:read'), TicketController.getTicketById);

// Submit new ticket
router.post('/', checkPermission('tickets:create'), TicketController.createTicket);

// Update ticket attributes (status, assignee, priority, category)
router.put('/:id', checkPermission('tickets:write'), TicketController.updateTicket);

// Collaboration notes & comments stream
router.post('/:id/comments', TicketController.addComment);

// Client feedback & closure
router.put('/:id/feedback', TicketController.submitFeedback);

module.exports = router;
