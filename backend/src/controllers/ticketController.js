const TicketModel = require('../models/ticketModel');
const UserModel = require('../models/userModel');
const { analyzeTicket } = require('../ai/aiOrchestrator');
const slaService = require('../services/slaService');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');

const TicketController = {
  // GET /api/v1/tickets
  async getAllTickets(req, res) {
    try {
      const { search, status, priority, type, category, assigneeId, sortBy, sortOrder, page, limit } = req.query;
      const { id: currentUserId, role_name } = req.user;

      const filterOptions = {
        search,
        status,
        priority,
        type,
        category,
        assigneeId,
        sortBy,
        sortOrder,
        page,
        limit
      };

      // Client users can ONLY view their own tickets
      if (role_name === 'Client') {
        filterOptions.clientId = currentUserId;
      }

      const result = await TicketModel.getAll(filterOptions);

      res.json({
        tickets: result.tickets,
        pagination: {
          total: result.total,
          page: parseInt(page, 10) || 1,
          limit: parseInt(limit, 10) || 10,
          pages: Math.ceil(result.total / (parseInt(limit, 10) || 10))
        }
      });
    } catch (err) {
      console.error('Get all tickets error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/v1/tickets/:id
  async getTicketById(req, res) {
    try {
      const { id } = req.params;
      const { id: currentUserId, role_name } = req.user;

      const ticket = await TicketModel.findById(id);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Security check: Clients can only access their own tickets
      if (role_name === 'Client' && ticket.client_id !== currentUserId) {
        return res.status(403).json({ message: 'Access denied: You can only view your own tickets' });
      }

      const comments = await TicketModel.getCommentsByTicketId(id);

      res.json({
        ticket,
        comments
      });
    } catch (err) {
      console.error('Get ticket by ID error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // POST /api/v1/tickets
  async createTicket(req, res) {
    try {
      const { title, description, type, category, priority } = req.body;
      const { id: currentUserId } = req.user;

      if (!title || !description || !type) {
        return res.status(400).json({ message: 'Title, description, and type are required' });
      }

      const validTypes = ['Incident', 'Service Request', 'Problem', 'Change Request'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
      }

      // Calculate SLA due date
      const sla_due_date = await slaService.calculateDueDate(priority);

      const ticket = await TicketModel.create({
        title,
        description,
        type,
        category,
        priority,
        client_id: currentUserId,
        sla_due_date
      });

      // Automatically add system comment for creation
      await TicketModel.addComment({
        ticket_id: ticket.id,
        user_id: currentUserId,
        comment: 'Ticket created successfully.'
      });

      // Send rich email notification to client (non-blocking via queue)
      const clientUser = await UserModel.findById(currentUserId);
      if (clientUser) {
        emailService.sendTicketCreatedEmail(clientUser.email, {
          ticketNumber: ticket.ticket_number,
          title: ticket.title,
          priority: ticket.priority,
          clientName: clientUser.name
        });
        // Real-time notification
        setImmediate(() => notificationService.ticketCreated(currentUserId, {
          ticketNumber: ticket.ticket_number,
          title: ticket.title,
          ticketId: ticket.id
        }));
      }

      // Fire-and-forget: AI analysis runs asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          await analyzeTicket({
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            type: ticket.type,
            created_by: currentUserId
          });
          console.log(`[AI] Analysis completed for ticket ${ticket.ticket_number}`);
        } catch (aiErr) {
          console.error(`[AI] Analysis failed for ticket ${ticket.ticket_number}:`, aiErr.message);
        }
      });

      res.status(201).json({
        message: 'Ticket created successfully',
        ticket
      });
    } catch (err) {
      console.error('Create ticket error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // PUT /api/v1/tickets/:id
  async updateTicket(req, res) {
    try {
      const { id } = req.params;
      const { status, priority, category, assignee_id } = req.body;
      const { id: currentUserId, role_name, name: currentUserName } = req.user;

      // Restrict ticket metadata updates to staff roles
      const staffRoles = ['Admin', 'Manager', 'Team Lead', 'Support Engineer'];
      if (!staffRoles.includes(role_name)) {
        return res.status(403).json({ message: 'Access denied: Insufficient privileges to update ticket attributes' });
      }

      const ticket = await TicketModel.findById(id);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      const updates = {};
      const changeLogs = [];

      // Validate and log Category updates
      if (category !== undefined && category !== ticket.category) {
        const validCategories = ['Hardware', 'Software', 'Network', 'Access', 'Billing', 'Other'];
        if (!validCategories.includes(category)) {
          return res.status(400).json({ message: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
        }
        updates.category = category;
        changeLogs.push(`Category updated from "${ticket.category}" to "${category}"`);
      }

      // Validate and log Priority updates
      if (priority !== undefined && priority !== ticket.priority) {
        const validPriorities = ['Low', 'Medium', 'High', 'Urgent', 'Critical'];
        if (!validPriorities.includes(priority)) {
          return res.status(400).json({ message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
        }
        updates.priority = priority;
        updates.sla_due_date = await slaService.calculateDueDate(priority, new Date(ticket.created_at));
        changeLogs.push(`Priority updated from "${ticket.priority}" to "${priority}"`);
      }

      // Validate and log Assignee updates
      if (assignee_id !== undefined && assignee_id !== ticket.assignee_id) {
        let assigneeName = 'Unassigned';
        if (assignee_id) {
          const assigneeUser = await UserModel.findById(assignee_id);
          if (!assigneeUser) {
            return res.status(400).json({ message: 'Invalid assignee ID' });
          }
          assigneeName = assigneeUser.name;
        }
        updates.assignee_id = assignee_id;
        const prevAssigneeName = ticket.assignee_name || 'Unassigned';
        changeLogs.push(`Assignee changed from "${prevAssigneeName}" to "${assigneeName}"`);
      }

      // Handle status or automate status transitions based on update flow
      let nextStatus = status;

      // If status is not explicitly passed, apply automatic transitions
      if (!nextStatus) {
        if (updates.category && ticket.status === 'Created') {
          nextStatus = 'Categorized';
        } else if (updates.priority && (ticket.status === 'Created' || ticket.status === 'Categorized')) {
          nextStatus = 'Prioritized';
        } else if (updates.assignee_id && (ticket.status === 'Created' || ticket.status === 'Categorized' || ticket.status === 'Prioritized')) {
          nextStatus = 'Assigned';
        }
      }

      if (nextStatus && nextStatus !== ticket.status) {
        const validStatuses = ['Created', 'Categorized', 'Prioritized', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
        if (!validStatuses.includes(nextStatus)) {
          return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        // Restrict resolution
        if (nextStatus === 'Resolved' && role_name === 'Support Engineer' && ticket.assignee_id !== currentUserId) {
          // Allow Team Leads, Managers, Admins, or assigned Engineer
          return res.status(403).json({ message: 'Access denied: Only the assigned Support Engineer or Team Leads/Managers can resolve this ticket.' });
        }

        updates.status = nextStatus;
        changeLogs.push(`Status updated from "${ticket.status}" to "${nextStatus}"`);
      }

      if (Object.keys(updates).length === 0) {
        return res.json({ message: 'No changes detected', ticket });
      }

      const updatedTicket = await TicketModel.update(id, updates);

      // Log system messages in comment section for history auditing
      for (const log of changeLogs) {
        await TicketModel.addComment({
          ticket_id: id,
          user_id: currentUserId,
          comment: `${log} by ${currentUserName}`
        });
      }

      // Email + Real-time notifications based on what changed (all non-blocking)
      if (updates.status && updates.status !== ticket.status) {
        // Notify client of status change
        if (ticket.client_email && ticket.client_id) {
          if (updates.status === 'Resolved') {
            emailService.sendTicketResolvedEmail(ticket.client_email, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              clientName: ticket.client_name || 'Customer',
              resolvedBy: currentUserName
            });
            setImmediate(() => notificationService.ticketResolved(ticket.client_id, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              ticketId: id,
              resolvedBy: currentUserName
            }));
          } else if (updates.status === 'Closed') {
            emailService.sendTicketClosedEmail(ticket.client_email, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              clientName: ticket.client_name || 'Customer'
            });
            setImmediate(() => notificationService.ticketClosed(ticket.client_id, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              ticketId: id
            }));
          } else {
            emailService.sendTicketStatusChangedEmail(ticket.client_email, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              clientName: ticket.client_name || 'Customer',
              oldStatus: ticket.status,
              newStatus: updates.status,
              changedBy: currentUserName
            });
            setImmediate(() => notificationService.ticketUpdated(ticket.client_id, {
              ticketNumber: ticket.ticket_number,
              status: updates.status,
              ticketId: id
            }));
          }
        }
      }

      // Notify new assignee (email + socket)
      if (updates.assignee_id && updates.assignee_id !== ticket.assignee_id) {
        const newAssignee = await UserModel.findById(updates.assignee_id);
        if (newAssignee) {
          emailService.sendTicketAssignedEmail(newAssignee.email, {
            ticketNumber: ticket.ticket_number,
            title: ticket.title,
            priority: ticket.priority,
            assigneeName: newAssignee.name,
            clientName: ticket.client_name || 'Customer'
          });
          // Socket: notify new assignee + notify old assignee if existed
          setImmediate(() => notificationService.ticketReassigned(
            updates.assignee_id,
            ticket.assignee_id !== updates.assignee_id ? ticket.assignee_id : null,
            { ticketNumber: ticket.ticket_number, title: ticket.title, ticketId: id }
          ));
        }
      }

      res.json({
        message: 'Ticket updated successfully',
        ticket: updatedTicket
      });
    } catch (err) {
      console.error('Update ticket error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // POST /api/v1/tickets/:id/comments
  async addComment(req, res) {
    try {
      const { id: ticketId } = req.params;
      const { comment } = req.body;
      const { id: currentUserId, role_name } = req.user;

      if (!comment || !comment.trim()) {
        return res.status(400).json({ message: 'Comment text cannot be empty' });
      }

      const ticket = await TicketModel.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Security check: Clients can only comment on their own tickets
      if (role_name === 'Client' && ticket.client_id !== currentUserId) {
        return res.status(403).json({ message: 'Access denied: You can only comment on your own tickets' });
      }

      const newComment = await TicketModel.addComment({
        ticket_id: ticketId,
        user_id: currentUserId,
        comment
      });

      res.status(201).json({
        message: 'Comment added successfully',
        comment: newComment
      });
    } catch (err) {
      console.error('Add ticket comment error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // PUT /api/v1/tickets/:id/feedback
  async submitFeedback(req, res) {
    try {
      const { id } = req.params;
      const { rating, comments } = req.body;
      const { id: currentUserId, name: currentUserName } = req.user;

      const numericRating = parseInt(rating, 10);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
      }

      const ticket = await TicketModel.findById(id);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Only the client owner can submit feedback
      if (ticket.client_id !== currentUserId) {
        return res.status(403).json({ message: 'Access denied: Only the ticket creator can submit feedback' });
      }

      // Feedback should only be submitted on Resolved tickets
      if (ticket.status !== 'Resolved') {
        return res.status(400).json({ message: 'Feedback can only be submitted for Resolved tickets' });
      }

      const updatedTicket = await TicketModel.update(id, {
        feedback_rating: numericRating,
        feedback_comments: comments || null,
        status: 'Closed' // Transition to Closed automatically on feedback submission
      });

      // Log the feedback submission to the comments stream
      await TicketModel.addComment({
        ticket_id: id,
        user_id: currentUserId,
        comment: `Feedback submitted: ${numericRating} Stars. Comments: "${comments || 'No comment'}". Ticket closed.`
      });

      res.json({
        message: 'Feedback submitted and ticket closed successfully',
        ticket: updatedTicket
      });
    } catch (err) {
      console.error('Submit feedback error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

module.exports = TicketController;
