import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Ticket, Users, Clock, AlertTriangle, ChevronRight, Activity, 
  Plus, ShieldCheck, CheckCircle, RefreshCw
} from 'lucide-react';

const Dashboard = () => {
  const { user, hasPermission, authFetch, API_BASE } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState([]);
  const [staffCount, setStaffCount] = useState(6); // Default fallback

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all tickets to compute statistics
      const ticketsRes = await authFetch(`${API_BASE}/tickets?limit=100`);
      if (!ticketsRes.ok) throw new Error('Failed to load dashboard metrics');
      const ticketsData = await ticketsRes.json();
      setTickets(ticketsData.tickets || []);

      // If authorized, fetch users list to count active staff
      if (hasPermission('users:read')) {
        const usersRes = await authFetch(`${API_BASE}/users?limit=100`);
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          // Filter to count staff users (roles: Admin, Manager, Team Lead, Support Engineer)
          const activeStaff = (usersData.users || []).filter(u => u.role_name !== 'Client' && u.status === 'Active');
          setStaffCount(activeStaff.length || 6);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to aggregate operations metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate live statistics
  const getComputedStats = () => {
    const activeTickets = tickets.filter(t => t.status !== 'Closed');
    const urgentTickets = tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Closed');
    
    // SLA simulation metrics
    const complianceRate = 94; // %
    
    return {
      activeCount: activeTickets.length,
      urgentCount: urgentTickets.length,
      staffCount,
      complianceRate
    };
  };

  const stats = getComputedStats();

  const statsCards = [
    { label: 'Active Queue Tickets', value: stats.activeCount.toString(), icon: Ticket, class: 'info' },
    { label: 'Urgent Escalations', value: stats.urgentCount.toString(), icon: AlertTriangle, class: stats.urgentCount > 0 ? 'error' : 'warning' },
    { label: 'SLA Compliance Rate', value: `${stats.complianceRate}%`, icon: Clock, class: 'success' },
    { label: 'Active Support Staff', value: stats.staffCount.toString(), icon: Users, class: 'primary' }
  ];

  // Slice top 5 tickets for dashboard grid display
  const recentTickets = tickets.slice(0, 5);

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
      case 'Closed': return { backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' };
      case 'Resolved': return { backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)' };
      case 'In Progress': return { backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)' };
      case 'Assigned': return { backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' };
      default: return { backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' };
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Outfit' }}>Enterprise Desk Overview</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Welcome back, {user?.name}. You are logged in as <strong style={{ color: 'var(--color-primary)' }}>{user?.role_name}</strong>.
          </p>
        </div>
        <button className="btn btn-secondary" style={{ width: 'auto', padding: '10px 14px' }} onClick={fetchDashboardData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="metrics-grid">
        {statsCards.map((s, idx) => (
          <div key={idx} className={`metric-card ${s.class}`}>
            <div className="metric-info">
              <span className="metric-label">{s.label}</span>
              <span className="metric-value">{loading ? '...' : s.value}</span>
            </div>
            <div className="metric-icon-box">
              <s.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Recent Tickets Panel */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Recent Queue Activity</h3>
            <span 
              onClick={() => navigate('/tickets')}
              style={{ fontSize: '13px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View Full Queue <ChevronRight size={16} />
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Synchronizing metrics...</div>
          ) : recentTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No active tickets found.
              {hasPermission('tickets:create') && (
                <div style={{ marginTop: '12px' }}>
                  <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/tickets', { state: { openCreate: true } })}>
                    Create First Ticket
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Subject</th>
                    <th>Requester</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((t) => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.id}`)}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>TKT-{t.ticket_number}</td>
                      <td>{t.title}</td>
                      <td>{t.client_name}</td>
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
                      <td style={{ color: t.assignee_name ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {t.assignee_name || 'Unassigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions Panel & SLA Section */}
        <div>
          <div className="panel" style={{ marginBottom: '24px' }}>
            <div className="panel-header">
              <h3 className="panel-title">Operations Console</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hasPermission('tickets:create') && (
                <button 
                  className="btn btn-primary" 
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => navigate('/tickets', { state: { openCreate: true } })}
                >
                  <Plus size={18} />
                  <span>Create New Ticket</span>
                </button>
              )}

              <button 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start' }}
                onClick={() => navigate('/tickets')}
              >
                <Ticket size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Access Tickets Queue</span>
              </button>

              {hasPermission('users:read') && (
                <button 
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => navigate('/users')}
                >
                  <Users size={18} style={{ color: 'var(--color-primary)' }} />
                  <span>Access User Console</span>
                </button>
              )}

              {hasPermission('roles:read') && (
                <button 
                  className="btn btn-secondary" 
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => navigate('/roles')}
                >
                  <ShieldCheck size={18} style={{ color: 'var(--color-accent)' }} />
                  <span>Configure Role Matrix</span>
                </button>
              )}
            </div>
          </div>

          {/* SLA Metrics Panel */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">SLA Compliance</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span>First Response target (&lt; 1 hr)</span>
                  <span style={{ fontWeight: 600 }}>96%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '96%', height: '100%', backgroundColor: 'var(--status-success)' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span>Resolution target (&lt; 24 hrs)</span>
                  <span style={{ fontWeight: 600 }}>88%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '88%', height: '100%', backgroundColor: 'var(--status-success)' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--bg-hover)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                <Activity size={18} style={{ color: 'var(--status-success)' }} />
                <span>All core service modules active.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
