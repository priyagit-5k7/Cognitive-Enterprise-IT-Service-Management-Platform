const db = require('../config/db');
const crypto = require('crypto');

const TicketModel = {
  async create({ title, description, type, category = 'Other', priority = 'Low', client_id, sla_due_date }) {
    if (db.isMock()) {
      const data = db.getMockData();
      
      let nextNumber = 1001;
      if (data.tickets.length > 0) {
        const maxNum = Math.max(...data.tickets.map(t => t.ticket_number || 0));
        nextNumber = maxNum >= 1000 ? maxNum + 1 : 1001;
      }

      const newTicket = {
        id: `ticket-${crypto.randomBytes(8).toString('hex')}`,
        ticket_number: nextNumber,
        title: title.trim(),
        description: description.trim(),
        type: type,
        status: 'Created',
        priority: priority,
        category: category,
        client_id: client_id,
        assignee_id: null,
        sla_due_date: sla_due_date || null,
        sla_breached: false,
        feedback_rating: null,
        feedback_comments: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      data.tickets.push(newTicket);
      db.saveMockData(data);

      // Return ticket details with client name (seeded client/admin)
      const client = data.users.find(u => u.id === client_id);
      return {
        ...newTicket,
        client_name: client ? client.name : 'Unknown',
        client_email: client ? client.email : ''
      };
    }

    const query = `
      INSERT INTO tickets (title, description, type, category, priority, client_id, sla_due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const { rows } = await db.query(query, [title.trim(), description.trim(), type, category, priority, client_id, sla_due_date]);
    
    // Fetch with client details
    return this.findById(rows[0].id);
  },

  async findById(id) {
    if (db.isMock()) {
      const data = db.getMockData();
      const ticket = data.tickets.find(t => t.id === id);
      if (!ticket) return null;

      const client = data.users.find(u => u.id === ticket.client_id);
      const assignee = ticket.assignee_id ? data.users.find(u => u.id === ticket.assignee_id) : null;

      return {
        ...ticket,
        client_name: client ? client.name : 'Unknown',
        client_email: client ? client.email : '',
        assignee_name: assignee ? assignee.name : null,
        assignee_email: assignee ? assignee.email : null
      };
    }

    const query = `
      SELECT t.*, 
             u1.name as client_name, u1.email as client_email,
             u2.name as assignee_name, u2.email as assignee_email
      FROM tickets t
      JOIN users u1 ON t.client_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      WHERE t.id = $1
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  },

  async getAll({
    search = '',
    status = '',
    priority = '',
    type = '',
    category = '',
    assigneeId = '',
    clientId = '',
    sortBy = 'created_at',
    sortOrder = 'DESC',
    page = 1,
    limit = 10
  }) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    if (db.isMock()) {
      const data = db.getMockData();
      let filtered = [...data.tickets];

      if (search) {
        const term = search.toLowerCase().trim();
        filtered = filtered.filter(t => 
          t.title.toLowerCase().includes(term) || 
          t.description.toLowerCase().includes(term) ||
          String(t.ticket_number).includes(term)
        );
      }

      if (status) {
        filtered = filtered.filter(t => t.status === status);
      }

      if (priority) {
        filtered = filtered.filter(t => t.priority === priority);
      }

      if (type) {
        filtered = filtered.filter(t => t.type === type);
      }

      if (category) {
        filtered = filtered.filter(t => t.category === category);
      }

      if (assigneeId) {
        filtered = filtered.filter(t => t.assignee_id === assigneeId);
      }

      if (clientId) {
        filtered = filtered.filter(t => t.client_id === clientId);
      }

      const total = filtered.length;

      // Sort logic
      const orderMultiplier = sortOrder.toUpperCase() === 'ASC' ? 1 : -1;
      filtered.sort((a, b) => {
        let fieldA, fieldB;
        if (sortBy === 'ticket_number') {
          fieldA = a.ticket_number;
          fieldB = b.ticket_number;
          return (fieldA - fieldB) * orderMultiplier;
        } else if (sortBy === 'title') {
          fieldA = a.title.toLowerCase();
          fieldB = b.title.toLowerCase();
        } else if (sortBy === 'status') {
          fieldA = a.status.toLowerCase();
          fieldB = b.status.toLowerCase();
        } else if (sortBy === 'priority') {
          // Custom priority weights
          const weights = { Low: 1, Medium: 2, High: 3, Urgent: 4 };
          fieldA = weights[a.priority] || 0;
          fieldB = weights[b.priority] || 0;
          return (fieldA - fieldB) * orderMultiplier;
        } else {
          // Default: created_at
          fieldA = new Date(a.created_at || 0).getTime();
          fieldB = new Date(b.created_at || 0).getTime();
          return (fieldA - fieldB) * orderMultiplier;
        }

        if (fieldA < fieldB) return -1 * orderMultiplier;
        if (fieldA > fieldB) return 1 * orderMultiplier;
        return 0;
      });

      // Pagination
      const offset = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(offset, offset + limitNum);

      // Join client and assignee details
      const ticketsMapped = paginated.map(t => {
        const client = data.users.find(u => u.id === t.client_id);
        const assignee = t.assignee_id ? data.users.find(u => u.id === t.assignee_id) : null;
        return {
          ...t,
          client_name: client ? client.name : 'Unknown',
          client_email: client ? client.email : '',
          assignee_name: assignee ? assignee.name : null,
          assignee_email: assignee ? assignee.email : null
        };
      });

      return { tickets: ticketsMapped, total };
    }

    // PostgreSQL Implementation
    let countQuery = `
      SELECT COUNT(*) as count 
      FROM tickets t
      WHERE 1=1
    `;
    
    let dataQuery = `
      SELECT t.*, 
             u1.name as client_name, u1.email as client_email,
             u2.name as assignee_name, u2.email as assignee_email
      FROM tickets t
      JOIN users u1 ON t.client_id = u1.id
      LEFT JOIN users u2 ON t.assignee_id = u2.id
      WHERE 1=1
    `;

    let whereClause = '';
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIndex = params.length;
      // Also match numeric ticket number if input is a number
      const isNum = !isNaN(search.trim());
      if (isNum) {
        whereClause += ` AND (t.title ILIKE $${searchIndex} OR t.description ILIKE $${searchIndex} OR t.ticket_number = ${parseInt(search.trim(), 10)})`;
      } else {
        whereClause += ` AND (t.title ILIKE $${searchIndex} OR t.description ILIKE $${searchIndex})`;
      }
    }

    if (status) {
      params.push(status);
      whereClause += ` AND t.status = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      whereClause += ` AND t.priority = $${params.length}`;
    }

    if (type) {
      params.push(type);
      whereClause += ` AND t.type = $${params.length}`;
    }

    if (category) {
      params.push(category);
      whereClause += ` AND t.category = $${params.length}`;
    }

    if (assigneeId) {
      params.push(assigneeId);
      whereClause += ` AND t.assignee_id = $${params.length}`;
    }

    if (clientId) {
      params.push(clientId);
      whereClause += ` AND t.client_id = $${params.length}`;
    }

    // Run Count query
    const countRes = await db.query(countQuery + whereClause, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Sorting fields mapping
    const allowedSortFields = {
      ticket_number: 't.ticket_number',
      title: 't.title',
      status: 't.status',
      priority: `CASE t.priority 
                  WHEN 'Low' THEN 1 
                  WHEN 'Medium' THEN 2 
                  WHEN 'High' THEN 3 
                  WHEN 'Urgent' THEN 4 
                  ELSE 0 END`,
      created_at: 't.created_at'
    };
    const sortColumn = allowedSortFields[sortBy] || 't.created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    dataQuery += whereClause + ` ORDER BY ${sortColumn} ${order}`;

    // Pagination limits
    const offset = (pageNum - 1) * limitNum;
    params.push(limitNum);
    dataQuery += ` LIMIT $${params.length}`;
    params.push(offset);
    dataQuery += ` OFFSET $${params.length}`;

    const { rows } = await db.query(dataQuery, params);
    return { tickets: rows, total };
  },

  async update(id, fields) {
    if (db.isMock()) {
      const data = db.getMockData();
      const idx = data.tickets.findIndex(t => t.id === id);
      if (idx === -1) return null;

      const ticket = data.tickets[idx];
      const updatableFields = ['status', 'priority', 'category', 'assignee_id', 'feedback_rating', 'feedback_comments', 'sla_due_date', 'sla_breached'];
      
      updatableFields.forEach(f => {
        if (fields[f] !== undefined) {
          ticket[f] = fields[f];
        }
      });

      ticket.updated_at = new Date().toISOString();
      db.saveMockData(data);

      return this.findById(id);
    }

    // Dynamic SQL update builder
    const setClause = [];
    const params = [id];
    const updatableFields = ['status', 'priority', 'category', 'assignee_id', 'feedback_rating', 'feedback_comments', 'sla_due_date', 'sla_breached'];
    
    updatableFields.forEach(f => {
      if (fields[f] !== undefined) {
        params.push(fields[f]);
        setClause.push(`${f} = $${params.length}`);
      }
    });

    if (setClause.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE tickets
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    await db.query(query, params);
    return this.findById(id);
  },

  async getCommentsByTicketId(ticketId) {
    if (db.isMock()) {
      const data = db.getMockData();
      const comments = data.ticket_comments.filter(c => c.ticket_id === ticketId);
      
      // Sort comments ASC (oldest first for message thread)
      comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return comments.map(c => {
        const user = data.users.find(u => u.id === c.user_id);
        const role = user ? data.roles.find(r => r.id === user.role_id) : null;
        return {
          ...c,
          user_name: user ? user.name : 'System User',
          user_email: user ? user.email : '',
          role_name: role ? role.name : 'User'
        };
      });
    }

    const query = `
      SELECT tc.*, 
             u.name as user_name, u.email as user_email,
             r.name as role_name
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE tc.ticket_id = $1
      ORDER BY tc.created_at ASC
    `;
    const { rows } = await db.query(query, [ticketId]);
    return rows;
  },

  async addComment({ ticket_id, user_id, comment }) {
    if (db.isMock()) {
      const data = db.getMockData();
      const newComment = {
        id: `comment-${crypto.randomBytes(8).toString('hex')}`,
        ticket_id,
        user_id,
        comment: comment.trim(),
        created_at: new Date().toISOString()
      };

      data.ticket_comments.push(newComment);
      db.saveMockData(data);

      const user = data.users.find(u => u.id === user_id);
      const role = user ? data.roles.find(r => r.id === user.role_id) : null;
      return {
        ...newComment,
        user_name: user ? user.name : 'System User',
        user_email: user ? user.email : '',
        role_name: role ? role.name : 'User'
      };
    }

    const query = `
      INSERT INTO ticket_comments (ticket_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const { rows } = await db.query(query, [ticket_id, user_id, comment.trim()]);
    
    // Fetch comment with user details
    const commentId = rows[0].id;
    const fetchQuery = `
      SELECT tc.*, 
             u.name as user_name, u.email as user_email,
             r.name as role_name
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE tc.id = $1
    `;
    const detailRows = await db.query(fetchQuery, [commentId]);
    return detailRows.rows[0];
  }
};

module.exports = TicketModel;
