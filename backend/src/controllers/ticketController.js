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
      const { search, status, priority, category, assigneeId, sortBy, sortOrder, page, limit } = req.query;
      const { id: currentUserId, role_name } = req.user;

      const filterOptions = {
        search,
        status,
        priority,
        category,
        assigneeId,
        sortBy,
        sortOrder,
        page,
        limit
      };

      // Client users can ONLY view their own tickets
      if (role_name === 'Client') {
        filterOptions.createdBy = currentUserId;
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
      if (role_name === 'Client' && ticket.created_by !== currentUserId) {
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
      const { title, description, category_id, category, priority } = req.body;
      const { id: currentUserId } = req.user;

      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }

      // Resolve category_id: accept either a UUID directly or a category name string
      let resolvedCategoryId = category_id || null;
      if (!resolvedCategoryId) {
        const db = require('../config/db');
        // If category name provided, look it up; otherwise use the first available category
        const catQuery = category
          ? 'SELECT id FROM ticket_categories WHERE LOWER(name) = LOWER($1) LIMIT 1'
          : 'SELECT id FROM ticket_categories ORDER BY name LIMIT 1';
        const catParams = category ? [category] : [];
        const catResult = await db.query(catQuery, catParams);
        if (catResult.rows.length > 0) {
          resolvedCategoryId = catResult.rows[0].id;
        } else {
          // Last resort: any category
          const anyResult = await db.query('SELECT id FROM ticket_categories LIMIT 1');
          resolvedCategoryId = anyResult.rows[0]?.id || null;
        }
      }

      // Calculate SLA due date
      const sla_due_date = await slaService.calculateDueDate(priority);

      const ticket = await TicketModel.create({
        title,
        description,
        category_id: resolvedCategoryId,
        priority,
        created_by: currentUserId,
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
      const { status, priority, category_id, assigned_to } = req.body;
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
      if (category_id !== undefined && category_id !== ticket.category_id) {
        updates.category_id = category_id;
        const prevCat = ticket.category_name || 'None';
        changeLogs.push(`Category updated from "${prevCat}" to new category`);
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
      if (assigned_to !== undefined && assigned_to !== ticket.assigned_to) {
        let assigneeName = 'Unassigned';
        if (assigned_to) {
          const assigneeUser = await UserModel.findById(assigned_to);
          if (!assigneeUser) {
            return res.status(400).json({ message: 'Invalid assignee ID' });
          }
          assigneeName = assigneeUser.name;
        }
        updates.assigned_to = assigned_to;
        const prevAssigneeName = ticket.assigned_to_name || 'Unassigned';
        changeLogs.push(`Assignee changed from "${prevAssigneeName}" to "${assigneeName}"`);
      }

      // Handle status or automate status transitions based on update flow
      let nextStatus = status;

      // If status is not explicitly passed, apply automatic transitions
      if (!nextStatus) {
        if (updates.category_id && ticket.status === 'Open') {
          nextStatus = 'Open'; // category update doesn't auto-transition
        } else if (updates.assigned_to && (ticket.status === 'Open' || ticket.status === 'In Progress')) {
          nextStatus = 'In Progress';
        }
      }

      if (nextStatus && nextStatus !== ticket.status) {
        const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        if (!validStatuses.includes(nextStatus)) {
          return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        // Restrict resolution
        if (nextStatus === 'Resolved' && role_name === 'Support Engineer' && ticket.assigned_to !== currentUserId) {
          return res.status(403).json({ message: 'Access denied: Only the assigned Support Engineer or Team Leads/Managers can resolve this ticket.' });
        }

        if (nextStatus === 'Closed') {
          updates.closed_at = new Date().toISOString();
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
        // Notify creator of status change
        if (ticket.created_by_email && ticket.created_by) {
          if (updates.status === 'Resolved') {
            emailService.sendTicketResolvedEmail(ticket.created_by_email, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              clientName: ticket.created_by_name || 'Customer',
              resolvedBy: currentUserName
            });
            setImmediate(() => notificationService.ticketResolved(ticket.created_by, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              ticketId: id,
              resolvedBy: currentUserName
            }));
          } else if (updates.status === 'Closed') {
            emailService.sendTicketClosedEmail(ticket.created_by_email, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              clientName: ticket.created_by_name || 'Customer'
            });
            setImmediate(() => notificationService.ticketClosed(ticket.created_by, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              ticketId: id
            }));
          } else {
            emailService.sendTicketStatusChangedEmail(ticket.created_by_email, {
              ticketNumber: ticket.ticket_number,
              title: ticket.title,
              clientName: ticket.created_by_name || 'Customer',
              oldStatus: ticket.status,
              newStatus: updates.status,
              changedBy: currentUserName
            });
            setImmediate(() => notificationService.ticketUpdated(ticket.created_by, {
              ticketNumber: ticket.ticket_number,
              status: updates.status,
              ticketId: id
            }));
          }
        }
      }

      // Notify new assignee (email + socket)
      if (updates.assigned_to && updates.assigned_to !== ticket.assigned_to) {
        const newAssignee = await UserModel.findById(updates.assigned_to);
        if (newAssignee) {
          emailService.sendTicketAssignedEmail(newAssignee.email, {
            ticketNumber: ticket.ticket_number,
            title: ticket.title,
            priority: ticket.priority,
            assigneeName: newAssignee.name,
            clientName: ticket.created_by_name || 'Customer'
          });
          // Socket: notify new assignee + notify old assignee if existed
          setImmediate(() => notificationService.ticketReassigned(
            updates.assigned_to,
            ticket.assigned_to !== updates.assigned_to ? ticket.assigned_to : null,
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
      if (role_name === 'Client' && ticket.created_by !== currentUserId) {
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

      // Only the ticket creator can submit feedback
      if (ticket.created_by !== currentUserId) {
        return res.status(403).json({ message: 'Access denied: Only the ticket creator can submit feedback' });
      }

      // Feedback should only be submitted on Resolved tickets
      if (ticket.status !== 'Resolved') {
        return res.status(400).json({ message: 'Feedback can only be submitted for Resolved tickets' });
      }

      const updatedTicket = await TicketModel.update(id, {
        status: 'Closed',
        closed_at: new Date().toISOString()
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
