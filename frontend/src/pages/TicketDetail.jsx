import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  ArrowLeft, MessageSquare, Send, User, Clock, AlertCircle, 
  CheckCircle, HelpCircle, Star, ShieldAlert
} from 'lucide-react';
import AiPredictionPanel from '../components/AiPredictionPanel';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, API_BASE, user, hasPermission } = useContext(AuthContext);

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Updates & commenting states
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [metaUpdating, setMetaUpdating] = useState(false);

  // Editable fields (for staff)
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAssignee, setEditAssignee] = useState('');

  // Feedback form states (for clients)
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch(`${API_BASE}/tickets/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Ticket not found');
        if (res.status === 403) throw new Error('You do not have permission to view this ticket');
        throw new Error('Failed to load ticket details');
      }
      const data = await res.json();
      setTicket(data.ticket);
      setComments(data.comments || []);
      
      // Initialize edit fields
      setEditStatus(data.ticket.status);
      setEditPriority(data.ticket.priority);
      setEditCategory(data.ticket.category);
      setEditAssignee(data.ticket.assignee_id || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    // Only load users if user is staff (authorized to assign)
    const isStaffRole = ['Admin', 'Manager', 'Team Lead', 'Support Engineer'].includes(user?.role_name);
    if (!isStaffRole) return;

    try {
      const res = await authFetch(`${API_BASE}/users?limit=100`);
      if (res.ok) {
        const data = await res.json();
        // Filter out Clients or show all staff candidates
        const staffUsers = (data.users || []).filter(u => u.role_name !== 'Client');
        setStaff(staffUsers);
      }
    } catch (err) {
      console.warn('Failed to load staff list for assignees dropdown:', err);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchStaffList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setError('');
      setCommentSubmitting(true);
      const res = await authFetch(`${API_BASE}/tickets/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add comment');

      setComments(prev => [...prev, data.comment]);
      setNewComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleMetadataUpdate = async (updatedFields = {}) => {
    try {
      setError('');
      setMetaUpdating(true);

      // Collate changes
      const payload = {
        status: updatedFields.status !== undefined ? updatedFields.status : editStatus,
        priority: updatedFields.priority !== undefined ? updatedFields.priority : editPriority,
        category: updatedFields.category !== undefined ? updatedFields.category : editCategory,
        assignee_id: updatedFields.assignee_id !== undefined ? updatedFields.assignee_id : (editAssignee || null)
      };

      const res = await authFetch(`${API_BASE}/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update ticket');

      setTicket(data.ticket);
      setEditStatus(data.ticket.status);
      setEditPriority(data.ticket.priority);
      setEditCategory(data.ticket.category);
      setEditAssignee(data.ticket.assignee_id || '');
      setSuccess('Ticket attributes updated successfully');
      
      // Reload comments to fetch the automatic system audit log comments
      const commentRes = await authFetch(`${API_BASE}/tickets/${id}`);
      if (commentRes.ok) {
        const commentData = await commentRes.json();
        setComments(commentData.comments || []);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setMetaUpdating(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setFeedbackSubmitting(true);

      const res = await authFetch(`${API_BASE}/tickets/${id}/feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: feedbackRating,
          comments: feedbackComments
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit feedback');

      setSuccess('Thank you! Your feedback has been recorded and this ticket is closed.');
      setTicket(data.ticket);
      setEditStatus(data.ticket.status);
      
      // Reload comments/activities
      const commentRes = await authFetch(`${API_BASE}/tickets/${id}`);
      if (commentRes.ok) {
        const commentData = await commentRes.json();
        setComments(commentData.comments || []);
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Loading ticket details...</div>;
  }

  if (error && !ticket) {
    return (
      <div style={{ padding: '24px' }}>
        <button onClick={() => navigate('/tickets')} className="btn btn-secondary" style={{ width: 'auto', marginBottom: '24px' }}>
          <ArrowLeft size={16} /> <span>Back to Queue</span>
        </button>
        <div className="panel" style={{ textAlign: 'center', padding: '40px', border: '1px solid var(--status-error)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--status-error)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Error Accessing Record</h3>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  const isClientOwner = ticket.client_id === user?.id;
  const isStaffUser = ['Admin', 'Manager', 'Team Lead', 'Support Engineer'].includes(user?.role_name);

  // Inline CSS helpers for statuses
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Closed': return { backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' };
      case 'Resolved': return { backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)' };
      case 'In Progress': return { backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)' };
      case 'Assigned': return { backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' };
      default: return { backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' };
    }
  };

  return (
    <div>
      {/* Top Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={() => navigate('/tickets')} className="btn btn-secondary" style={{ width: 'auto', padding: '10px 18px' }}>
          <ArrowLeft size={16} /> <span>Back to Queue</span>
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Ticket status:</span>
          <span className="badge" style={{ ...getStatusBadgeStyle(ticket.status), padding: '8px 16px', fontSize: '13px', borderRadius: '16px' }}>
            {ticket.status}
          </span>
        </div>
      </div>

      {ticket.sla_due_date && ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
        <div className={`alert ${ticket.sla_breached ? 'alert-danger' : 'alert-info'}`} style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} />
          <span>
            {ticket.sla_breached ? (
              <strong>SLA Breached! Target resolution time was {new Date(ticket.sla_due_date).toLocaleString()}</strong>
            ) : (
              <span>SLA Target Resolution: <strong>{new Date(ticket.sla_due_date).toLocaleString()}</strong></span>
            )}
          </span>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', fontWeight: 500 }}>
          {success}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: Core Description, Comments Thread, Feedback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main Description */}
          <div className="panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 700 }}>TKT-{ticket.ticket_number} • {ticket.type}</span>
                <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{ticket.title}</h1>
              </div>
            </div>
            
            <div style={{ fontSize: '15px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
              {ticket.description}
            </div>
          </div>

          {/* Timeline & Collaboration Comments Thread */}
          <div className="panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <MessageSquare size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Activities & Dialogue Stream</span>
            </h3>

            {/* Message timeline list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '450px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No activity logged on this ticket yet.</div>
              ) : (
                comments.map((c) => {
                  const isSystemMsg = c.comment.startsWith('Status updated') || c.comment.startsWith('Category updated') || c.comment.startsWith('Priority updated') || c.comment.startsWith('Assignee changed') || c.comment.startsWith('Ticket created') || c.comment.startsWith('Feedback submitted');
                  const isCurrentUser = c.user_id === user?.id;

                  if (isSystemMsg) {
                    return (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)', padding: '6px 14px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12} />
                          <span>{c.comment} ({new Date(c.created_at).toLocaleString()})</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: isCurrentUser ? 'flex-end' : 'flex-start', maxWidth: '80%', alignItems: isCurrentUser ? 'flex-end' : 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', padding: '0 4px' }}>
                        <span style={{ fontWeight: 600 }}>{c.user_name}</span>
                        <span>({c.role_name})</span>
                        <span>•</span>
                        <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      <div style={{ 
                        backgroundColor: isCurrentUser ? 'var(--color-primary)' : 'var(--bg-hover)',
                        color: isCurrentUser ? 'var(--text-light)' : 'var(--text-main)',
                        padding: '12px 16px',
                        borderRadius: isCurrentUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        fontSize: '14px',
                        boxShadow: 'var(--shadow-sm)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {c.comment}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Submission Form */}
            {ticket.status !== 'Closed' ? (
              <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '14px' }}
                  placeholder="Post an internal note or reply to requester..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={commentSubmitting}
                />
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '12px' }} disabled={commentSubmitting || !newComment.trim()}>
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                This ticket is Closed. Dialogue streams are locked.
              </div>
            )}
          </div>

          {/* CLIENT SATISFACTION FEEDBACK (Active when status is Resolved & user is the owner) */}
          {ticket.status === 'Resolved' && isClientOwner && (
            <div className="panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(34, 197, 94, 0.05) 100%)', border: '1px solid var(--status-success)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <CheckCircle size={20} style={{ color: 'var(--status-success)' }} />
                <span>Client Quality Review Survey</span>
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                The support staff has marked your request as resolved. Please provide a rating and remarks to close out the record.
              </p>

              <form onSubmit={handleFeedbackSubmit}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Resolution Score (1 to 5 stars)</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        onClick={() => setFeedbackRating(star)}
                      >
                        <Star 
                          size={28} 
                          fill={star <= feedbackRating ? 'gold' : 'none'} 
                          color={star <= feedbackRating ? 'gold' : 'var(--text-muted)'} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Review Remarks</label>
                  <textarea 
                    className="form-control" 
                    rows={3}
                    style={{ paddingLeft: '14px', resize: 'vertical' }}
                    placeholder="e.g. Prompt support, resolved efficiently. Thanks!"
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 24px' }} disabled={feedbackSubmitting}>
                  {feedbackSubmitting ? 'Closing ticket...' : 'Confirm Resolution & Close Ticket'}
                </button>
              </form>
            </div>
          )}

          {/* SHOW FEEDBACK (If already closed with rating) */}
          {ticket.status === 'Closed' && ticket.feedback_rating && (
            <div className="panel" style={{ padding: '24px', backgroundColor: 'rgba(34, 197, 94, 0.03)', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <CheckCircle size={18} style={{ color: 'var(--status-success)' }} />
                <span>Client Quality Review Results</span>
              </h4>
              
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={16} 
                    fill={star <= ticket.feedback_rating ? 'gold' : 'none'} 
                    color={star <= ticket.feedback_rating ? 'gold' : 'var(--border-color)'} 
                  />
                ))}
              </div>
              <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-main)' }}>
                "{ticket.feedback_comments || 'No comment submitted'}"
              </p>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Metadata Management (Staff dropdown selectors / Read-only for clients) */}
        <div>
          {isStaffUser && (
            <AiPredictionPanel
              ticketId={id}
              userRole={user?.role_name}
              onAssignEngineer={(engineerId) => handleMetadataUpdate({ assignee_id: engineerId })}
            />
          )}
          
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Ticket Attributes
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Type */}
              <div>
                <span className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Type</span>
                <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{ticket.type}</div>
              </div>

              {/* Status */}
              <div>
                <span className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lifecycle Status</span>
                {isStaffUser && ticket.status !== 'Closed' ? (
                  <select
                    className="form-control"
                    style={{ paddingLeft: '10px', paddingRight: '10px', marginTop: '4px', fontSize: '13px', height: '36px' }}
                    value={editStatus}
                    onChange={(e) => {
                      setEditStatus(e.target.value);
                      handleMetadataUpdate({ status: e.target.value });
                    }}
                    disabled={metaUpdating}
                  >
                    <option value="Created">Created</option>
                    <option value="Categorized">Categorized</option>
                    <option value="Prioritized">Prioritized</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                ) : (
                  <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{ticket.status}</div>
                )}
              </div>

              {/* Priority */}
              <div>
                <span className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Priority Severity</span>
                {isStaffUser && ticket.status !== 'Closed' ? (
                  <select
                    className="form-control"
                    style={{ paddingLeft: '10px', paddingRight: '10px', marginTop: '4px', fontSize: '13px', height: '36px' }}
                    value={editPriority}
                    onChange={(e) => {
                      setEditPriority(e.target.value);
                      handleMetadataUpdate({ priority: e.target.value });
                    }}
                    disabled={metaUpdating}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                ) : (
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge ${ticket.priority === 'Urgent' ? 'status-error' : ticket.priority === 'High' ? 'status-warning' : 'status-default'}`}>
                      {ticket.priority}
                    </span>
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <span className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Category</span>
                {isStaffUser && ticket.status !== 'Closed' ? (
                  <select
                    className="form-control"
                    style={{ paddingLeft: '10px', paddingRight: '10px', marginTop: '4px', fontSize: '13px', height: '36px' }}
                    value={editCategory}
                    onChange={(e) => {
                      setEditCategory(e.target.value);
                      handleMetadataUpdate({ category: e.target.value });
                    }}
                    disabled={metaUpdating}
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Network">Network</option>
                    <option value="Access">Access</option>
                    <option value="Billing">Billing</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{ticket.category}</div>
                )}
              </div>

              {/* Assignee */}
              <div>
                <span className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned Staff</span>
                {isStaffUser && ticket.status !== 'Closed' ? (
                  <select
                    className="form-control"
                    style={{ paddingLeft: '10px', paddingRight: '10px', marginTop: '4px', fontSize: '13px', height: '36px' }}
                    value={editAssignee}
                    onChange={(e) => {
                      setEditAssignee(e.target.value);
                      handleMetadataUpdate({ assignee_id: e.target.value || null });
                    }}
                    disabled={metaUpdating}
                  >
                    <option value="">Unassigned</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role_name})</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px', color: ticket.assignee_name ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {ticket.assignee_name || 'Unassigned'}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '8px 0' }}></div>

              {/* Requester details */}
              <div>
                <span className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requester Client</span>
                <div style={{ fontWeight: 500, fontSize: '13px', marginTop: '2px' }}>{ticket.client_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ticket.client_email}</div>
              </div>

              {/* Created & Updated dates */}
              <div>
                <span className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Timestamps</span>
                <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-muted)' }}>
                  Created: {new Date(ticket.created_at).toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-muted)' }}>
                  Modified: {new Date(ticket.updated_at).toLocaleString()}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TicketDetail;
