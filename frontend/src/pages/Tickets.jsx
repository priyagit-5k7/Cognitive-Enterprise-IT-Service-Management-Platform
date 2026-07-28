import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Search, Plus, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, AlertCircle, Ticket, Layers, ArrowUp, ArrowDown
} from 'lucide-react';

const Tickets = () => {
  const { authFetch, API_BASE, user, hasPermission } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering & Pagination States
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Creation Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Incident',
    category: 'Other',
    priority: 'Low'
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (typeFilter) queryParams.append('type', typeFilter);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (priorityFilter) queryParams.append('priority', priorityFilter);
      if (categoryFilter) queryParams.append('category', categoryFilter);
      queryParams.append('sortBy', sortBy);
      queryParams.append('sortOrder', sortOrder);
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const res = await authFetch(`${API_BASE}/tickets?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load tickets');
      const data = await res.json();

      setTickets(data.tickets || []);
      setPagination(data.pagination || { total: 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, statusFilter, priorityFilter, categoryFilter, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    if (location.state?.openCreate) {
      handleOpenCreateModal();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      title: '',
      description: '',
      type: 'Incident',
      category: 'Other',
      priority: 'Low'
    });
    setError('');
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required.');
      return;
    }

    try {
      setError('');
      setSubmitting(true);
      const res = await authFetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create ticket');

      setSuccess('Ticket submitted successfully');
      setShowCreateModal(false);
      fetchTickets();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Urgent': return 'status-error';
      case 'High': return 'status-warning';
      case 'Medium': return 'status-info';
      default: return 'status-default';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Closed':
        return { backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' };
      case 'Resolved':
        return { backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)' };
      case 'In Progress':
        return { backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)' };
      case 'Assigned':
        return { backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' };
      default:
        return { backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' };
    }
  };

  // Quick aggregate counters for UX top panel
  const getMetrics = () => {
    const total = pagination.total;
    const openCount = tickets.filter(t => ['Created', 'Categorized', 'Prioritized'].includes(t.status)).length;
    const inProgressCount = tickets.filter(t => t.status === 'In Progress' || t.status === 'Assigned').length;
    const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
    return { total, openCount, inProgressCount, resolvedCount };
  };

  const metrics = getMetrics();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Outfit' }}>Ticket Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>File complaints, assign tasks, and monitor customer SLA compliance.</p>
        </div>
        {hasPermission('tickets:create') && (
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Create New Ticket</span>
          </button>
        )}
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', fontWeight: 500 }}>
          {success}
        </div>
      )}

      {/* Mini Stats Bar */}
      <div className="metrics-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="metric-card info" style={{ padding: '16px' }}>
          <div className="metric-info">
            <span className="metric-label">All Tickets</span>
            <span className="metric-value" style={{ fontSize: '22px' }}>{metrics.total}</span>
          </div>
          <div className="metric-icon-box"><Ticket size={18} /></div>
        </div>
        <div className="metric-card warning" style={{ padding: '16px' }}>
          <div className="metric-info">
            <span className="metric-label">Awaiting Dispatch</span>
            <span className="metric-value" style={{ fontSize: '22px' }}>{metrics.openCount}</span>
          </div>
          <div className="metric-icon-box"><AlertCircle size={18} /></div>
        </div>
        <div className="metric-card primary" style={{ padding: '16px' }}>
          <div className="metric-info">
            <span className="metric-label">In Flight / Assigned</span>
            <span className="metric-value" style={{ fontSize: '22px' }}>{metrics.inProgressCount}</span>
          </div>
          <div className="metric-icon-box"><Layers size={18} /></div>
        </div>
        <div className="metric-card success" style={{ padding: '16px' }}>
          <div className="metric-info">
            <span className="metric-label">Completed / Closed</span>
            <span className="metric-value" style={{ fontSize: '22px' }}>{metrics.resolvedCount}</span>
          </div>
          <div className="metric-icon-box"><Eye size={18} /></div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="input-container" style={{ flexGrow: 1, minWidth: '240px' }}>
            <Search size={18} className="input-icon" />
            <input 
              type="text" 
              placeholder="Search by ticket ID, title, or summary..." 
              className="form-control"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flexGrow: 2 }}>
            <select 
              className="form-control" 
              style={{ width: 'auto', padding: '10px 14px', flexGrow: 1 }}
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              <option value="Incident">Incident</option>
              <option value="Service Request">Service Request</option>
              <option value="Problem">Problem</option>
              <option value="Change Request">Change Request</option>
            </select>

            <select 
              className="form-control" 
              style={{ width: 'auto', padding: '10px 14px', flexGrow: 1 }}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Created">Created</option>
              <option value="Categorized">Categorized</option>
              <option value="Prioritized">Prioritized</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            <select 
              className="form-control" 
              style={{ width: 'auto', padding: '10px 14px', flexGrow: 1 }}
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>

            <select 
              className="form-control" 
              style={{ width: 'auto', padding: '10px 14px', flexGrow: 1 }}
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Network">Network</option>
              <option value="Access">Access</option>
              <option value="Billing">Billing</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ticket List Grid */}
      <div className="panel">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading tickets queue...</div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No tickets found matching the filter criteria.</div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('ticket_number')}>
                    ID {sortBy === 'ticket_number' && (sortOrder === 'ASC' ? <ArrowUp size={14} style={{ display: 'inline' }} /> : <ArrowDown size={14} style={{ display: 'inline' }} />)}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('title')}>
                    Subject {sortBy === 'title' && (sortOrder === 'ASC' ? <ArrowUp size={14} style={{ display: 'inline' }} /> : <ArrowDown size={14} style={{ display: 'inline' }} />)}
                  </th>
                  <th>Category</th>
                  <th>Type</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('priority')}>
                    Priority {sortBy === 'priority' && (sortOrder === 'ASC' ? <ArrowUp size={14} style={{ display: 'inline' }} /> : <ArrowDown size={14} style={{ display: 'inline' }} />)}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                    Status {sortBy === 'status' && (sortOrder === 'ASC' ? <ArrowUp size={14} style={{ display: 'inline' }} /> : <ArrowDown size={14} style={{ display: 'inline' }} />)}
                  </th>
                  <th>Requester</th>
                  <th>Assignee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.id}`)}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>TKT-{t.ticket_number}</td>
                    <td style={{ fontWeight: 500 }}>
                      <div>{t.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                        Updated: {new Date(t.updated_at).toLocaleString()}
                      </div>
                    </td>
                    <td>{t.category}</td>
                    <td>{t.type}</td>
                    <td>
                      <span className={`badge ${getPriorityBadgeClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={getStatusBadgeStyle(t.status)}>
                        {t.status}
                      </span>
                    </td>
                    <td>{t.client_name}</td>
                    <td style={{ color: t.assignee_name ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {t.assignee_name || 'Unassigned'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', width: 'auto' }} onClick={() => navigate(`/tickets/${t.id}`)}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {!loading && pagination.pages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing Page {page} of {pagination.pages} ({pagination.total} total items)
            </span>
            <div className="pagination-buttons" style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => setPage(1)} 
                disabled={page === 1}
                className="btn btn-secondary" 
                style={{ padding: '6px 8px', width: 'auto' }}
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                disabled={page === 1}
                className="btn btn-secondary" 
                style={{ padding: '6px 8px', width: 'auto' }}
              >
                <ChevronLeft size={16} />
              </button>
              
              {/* Simple page numbers */}
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, idx) => {
                let pageNumber = page - 2 + idx;
                if (pageNumber <= 0) pageNumber = idx + 1;
                if (pageNumber > pagination.pages) return null;
                return (
                  <button 
                    key={pageNumber} 
                    onClick={() => setPage(pageNumber)}
                    className={`btn ${page === pageNumber ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', width: 'auto', fontWeight: 600 }}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button 
                onClick={() => setPage(prev => Math.min(prev + 1, pagination.pages))} 
                disabled={page === pagination.pages}
                className="btn btn-secondary" 
                style={{ padding: '6px 8px', width: 'auto' }}
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => setPage(pagination.pages)} 
                disabled={page === pagination.pages}
                className="btn btn-secondary" 
                style={{ padding: '6px 8px', width: 'auto' }}
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '600px', margin: '20px', position: 'relative', animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 className="panel-title" style={{ fontSize: '20px' }}>Create Support Request</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', borderRadius: '6px', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Subject Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '14px' }}
                  placeholder="e.g. Printer offline in Room 402"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Details / Description</label>
                <textarea 
                  className="form-control" 
                  rows={4}
                  style={{ paddingLeft: '14px', resize: 'vertical' }}
                  placeholder="Please describe your issue, steps to reproduce, or requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ticket Type</label>
                  <select 
                    className="form-control" 
                    style={{ paddingLeft: '14px' }}
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="Incident">Incident</option>
                    <option value="Service Request">Service Request</option>
                    <option value="Problem">Problem</option>
                    <option value="Change Request">Change Request</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <select 
                    className="form-control" 
                    style={{ paddingLeft: '14px' }}
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Network">Network</option>
                    <option value="Access">Access</option>
                    <option value="Billing">Billing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Priority</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`btn ${formData.priority === p ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                      onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: 'auto', padding: '10px 20px' }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
