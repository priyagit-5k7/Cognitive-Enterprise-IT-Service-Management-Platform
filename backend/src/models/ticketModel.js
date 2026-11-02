const db = require('../config/db');

const TicketModel = {
  /**
   * Create a new ticket
   */
  async create({ title, description, category_id, priority = 'Low', created_by, sla_due_date }) {
    const query = `
      INSERT INTO tickets (ticket_number, title, description, category_id, priority, status, created_by, sla_due_date)
      VALUES (
        'TKT-' || LPAD(NEXTVAL('ticket_number_seq')::TEXT, 6, '0'),
        $1, $2, $3, $4, 'Open', $5, $6
      )
      RETURNING *
    `;
    const { rows } = await db.query(query, [title.trim(), description.trim(), category_id, priority, created_by, sla_due_date]);
    return this.findById(rows[0].id);
  },

  /**
   * Find ticket by ID with joined user and category details
   */
  async findById(id) {
    const query = `
      SELECT t.*, 
             u1.name AS created_by_name, u1.email AS created_by_email,
             u2.name AS assigned_to_name, u2.email AS assigned_to_email,
             tc.name AS category_name, tc.color AS category_color
      FROM tickets t
      JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      WHERE t.id = $1
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  },

  /**
   * Get all tickets with filters, sorting, and pagination
   */
  async getAll({
    search = '',
    status = '',
    priority = '',
    category = '',
    assigneeId = '',
    createdBy = '',
    sortBy = 'created_at',
    sortOrder = 'DESC',
    page = 1,
    limit = 10
  } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    const baseJoin = `
      FROM tickets t
      JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      WHERE 1=1
    `;

    let whereClause = '';
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      const isNum = !isNaN(search.trim()) && search.trim() !== '';
      if (isNum) {
        whereClause += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length} OR t.ticket_number ILIKE $${params.length})`;
      } else {
        whereClause += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length} OR t.ticket_number ILIKE $${params.length})`;
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

    if (category) {
      params.push(category);
      whereClause += ` AND (tc.name = $${params.length} OR t.category_id::text = $${params.length})`;
    }

    if (assigneeId) {
      params.push(assigneeId);
      whereClause += ` AND t.assigned_to = $${params.length}`;
    }

    if (createdBy) {
      params.push(createdBy);
      whereClause += ` AND t.created_by = $${params.length}`;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) AS count ${baseJoin}${whereClause}`;
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Sorting
    const allowedSortFields = {
      ticket_number: 't.ticket_number',
      title: 't.title',
      status: 't.status',
      priority: `CASE t.priority WHEN 'Low' THEN 1 WHEN 'Medium' THEN 2 WHEN 'High' THEN 3 WHEN 'Urgent' THEN 4 WHEN 'Critical' THEN 5 ELSE 0 END`,
      created_at: 't.created_at',
      updated_at: 't.updated_at'
    };
    const sortColumn = allowedSortFields[sortBy] || 't.created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Data query
    const dataQuery = `
      SELECT t.*, 
             u1.name AS created_by_name, u1.email AS created_by_email,
             u2.name AS assigned_to_name, u2.email AS assigned_to_email,
             tc.name AS category_name, tc.color AS category_color
      ${baseJoin}${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const offset = (pageNum - 1) * limitNum;
    const { rows } = await db.query(dataQuery, [...params, limitNum, offset]);

    return { tickets: rows, total };
  },

  /**
   * Update ticket fields
   */
  async update(id, fields) {
    const setClause = [];
    const params = [id];

    const updatableFields = [
      'status', 'priority', 'category_id', 'assigned_to',
      'sla_due_date', 'sla_breached', 'due_date', 'closed_at'
    ];

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

  /**
   * Get comments for a ticket
   */
  async getCommentsByTicketId(ticketId) {
    const query = `
      SELECT tc.*, 
             u.name AS user_name, u.email AS user_email,
             r.name AS role_name
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE tc.ticket_id = $1
      ORDER BY tc.created_at ASC
    `;
    const { rows } = await db.query(query, [ticketId]);
    return rows;
  },

  /**
   * Add a comment to a ticket
   */
  async addComment({ ticket_id, user_id, comment }) {
    const query = `
      INSERT INTO ticket_comments (ticket_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const { rows } = await db.query(query, [ticket_id, user_id, comment.trim()]);
    const commentId = rows[0].id;

    const fetchQuery = `
      SELECT tc.*, 
             u.name AS user_name, u.email AS user_email,
             r.name AS role_name
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE tc.id = $1
    `;
    const detailRows = await db.query(fetchQuery, [commentId]);
    return detailRows.rows[0];
  },

  /**
   * Get ticket attachments
   */
  async getAttachments(ticketId) {
    const query = `
      SELECT ta.*, u.name AS uploaded_by_name
      FROM ticket_attachments ta
      JOIN users u ON ta.uploaded_by = u.id
      WHERE ta.ticket_id = $1
      ORDER BY ta.uploaded_at DESC
    `;
    const { rows } = await db.query(query, [ticketId]);
    return rows;
  },

  /**
   * Add attachment to ticket
   */
  async addAttachment({ ticket_id, uploaded_by, file_name, file_path, file_size, mime_type }) {
    const query = `
      INSERT INTO ticket_attachments (ticket_id, uploaded_by, file_name, file_path, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const { rows } = await db.query(query, [ticket_id, uploaded_by, file_name, file_path, file_size, mime_type]);
    return rows[0];
  }
};

module.exports = TicketModel;
