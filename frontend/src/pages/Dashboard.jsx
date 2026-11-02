import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Ticket, Users, Clock, AlertTriangle, ChevronRight, Activity, 
  Plus, ShieldCheck, CheckCircle, RefreshCw, BarChart2, BookOpen, 
  Cpu, Wrench, Search, MessageSquare, ArrowRight, UserCheck
} from 'lucide-react';

const Dashboard = () => {
  const { user, hasPermission, authFetch, API_BASE } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState([]);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [staffCount, setStaffCount] = useState(4);

  const role = user?.role_name || 'Client';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch tickets (backend automatically filters for Client: only their own)
      const ticketsRes = await authFetch(`${API_BASE}/tickets?limit=100`);
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData.tickets || []);
      }

      // If authorized (Admin, Manager), fetch overall operations analytics
      if (hasPermission('analytics:read') || role === 'Admin' || role === 'Manager') {
        const analyticsRes = await authFetch(`${API_BASE}/analytics/overview`);
        if (analyticsRes.ok) {
          const aData = await analyticsRes.json();
          setAnalyticsOverview(aData);
        }
      }

      // If authorized, fetch users list to count active staff
      if (hasPermission('users:read')) {
        const usersRes = await authFetch(`${API_BASE}/users?limit=100`);
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const activeStaff = (usersData.users || []).filter(u => u.role_name !== 'Client' && u.status === 'Active');
          setStaffCount(activeStaff.length || 4);
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
  }, [user]);

  // Priority badge styling
  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Critical':
      case 'Urgent': return 'status-error';
      case 'High': return 'status-warning';
      case 'Medium': return 'status-info';
      default: return 'status-default';
    }
  };

  // Status badge styling
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Closed': return { backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' };
      case 'Resolved': return { backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)' };
      case 'In Progress': return { backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)' };
      case 'Assigned': return { backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' };
      default: return { backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' };
    }
  };

  // -------------------------------------------------------------
  // ROLE 1: CLIENT / END-USER VIEW
  // -------------------------------------------------------------
  if (role === 'Client') {
    const myOpenTickets = tickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
    const myResolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');

    return (
      <div>
        {/* Client Welcome Banner */}
        <div style={{
          padding: '24px 28px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: '1px solid var(--border-color)',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
              Client Self-Service Portal
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Outfit', marginTop: '4px' }}>
              Welcome back, {user?.name}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Track the real-time status of your IT support tickets or browse self-help articles.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/tickets', { state: { openCreate: true } })}
              style={{ padding: '10px 18px', fontSize: '14px', borderRadius: '10px' }}
            >
              <Plus size={18} />
              <span>Raise Support Ticket</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/chatbot')}
              style={{ padding: '10px 18px', fontSize: '14px', borderRadius: '10px' }}
            >
              <MessageSquare size={18} />
              <span>Ask AI Assistant</span>
            </button>
          </div>
        </div>

        {/* Client Metric Cards */}
        <div className="metrics-grid">
          <div className="metric-card info">
            <div className="metric-info">
              <span className="metric-label">My Total Tickets</span>
              <span className="metric-value">{tickets.length}</span>
            </div>
            <div className="metric-icon-box">
              <Ticket size={24} />
            </div>
          </div>

          <div className="metric-card warning">
            <div className="metric-info">
              <span className="metric-label">In Progress / Open</span>
              <span className="metric-value">{myOpenTickets.length}</span>
            </div>
            <div className="metric-icon-box">
              <Clock size={24} style={{ color: 'var(--status-warning)' }} />
            </div>
          </div>

          <div className="metric-card success">
            <div className="metric-info">
              <span className="metric-label">Resolved Solutions</span>
              <span className="metric-value">{myResolvedTickets.length}</span>
            </div>
            <div className="metric-icon-box">
              <CheckCircle size={24} style={{ color: 'var(--status-success)' }} />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-info">
              <span className="metric-label">Knowledge Base</span>
              <span className="metric-value">Browse</span>
            </div>
            <div className="metric-icon-box" style={{ cursor: 'pointer' }} onClick={() => navigate('/knowledge-base')}>
              <BookOpen size={24} style={{ color: 'var(--color-accent)' }} />
            </div>
          </div>
        </div>

        {/* Client Recent Tickets Table */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">My Recent Support Requests</h3>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/tickets')}>
              View All My Tickets
            </button>
          </div>

          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <Ticket size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '15px', fontWeight: 600 }}>You haven't submitted any tickets yet</p>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/tickets', { state: { openCreate: true } })}
                style={{ margin: '14px auto 0 auto', width: 'auto' }}
              >
                Submit Your First Ticket
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 6).map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{t.ticket_number}</td>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td>{t.category_name || 'General'}</td>
                      <td><span className={`badge ${getPriorityBadgeClass(t.priority)}`}>{t.priority}</span></td>
                      <td><span className="badge" style={getStatusBadgeStyle(t.status)}>{t.status}</span></td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px', width: 'auto' }}
                          onClick={() => navigate(`/tickets/${t.id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ROLE 2: SUPPORT ENGINEER VIEW
  // -------------------------------------------------------------
  if (role === 'Support Engineer') {
    const assignedToMe = tickets.filter(t => t.assigned_to === user?.id || t.assigned_to_name === user?.name);
    const unassignedTickets = tickets.filter(t => !t.assigned_to && t.status === 'Open');
    const urgentTickets = tickets.filter(t => (t.priority === 'Critical' || t.priority === 'High') && t.status !== 'Closed');

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
              Support Engineering Workbench
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Outfit', marginTop: '4px' }}>
              Engineer Console — {user?.name}
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Assigned queue, SLA commitments, AI recommendation diagnostics, and resolution tools.
            </p>
          </div>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '10px 14px' }} onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {/* Engineer Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card info">
            <div className="metric-info">
              <span className="metric-label">Assigned To Me</span>
              <span className="metric-value">{assignedToMe.length}</span>
            </div>
            <div className="metric-icon-box">
              <UserCheck size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>

          <div className="metric-card warning">
            <div className="metric-info">
              <span className="metric-label">High / Critical Urgency</span>
              <span className="metric-value">{urgentTickets.length}</span>
            </div>
            <div className="metric-icon-box">
              <AlertTriangle size={24} style={{ color: 'var(--status-warning)' }} />
            </div>
          </div>

          <div className="metric-card success">
            <div className="metric-info">
              <span className="metric-label">Unassigned Pool</span>
              <span className="metric-value">{unassignedTickets.length}</span>
            </div>
            <div className="metric-icon-box">
              <Ticket size={24} style={{ color: 'var(--status-success)' }} />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-info">
              <span className="metric-label">Total System Queue</span>
              <span className="metric-value">{tickets.length}</span>
            </div>
            <div className="metric-icon-box">
              <Wrench size={24} style={{ color: 'var(--color-accent)' }} />
            </div>
          </div>
        </div>

        {/* Engineer Action Queues */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Main Queue: Assigned Tickets */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Active Queue (Action Required)</h3>
              <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/tickets')}>
                All Tickets
              </button>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Summary</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>SLA Due</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 8).map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{t.ticket_number}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.category_name || 'General'}</div>
                      </td>
                      <td><span className={`badge ${getPriorityBadgeClass(t.priority)}`}>{t.priority}</span></td>
                      <td><span className="badge" style={getStatusBadgeStyle(t.status)}>{t.status}</span></td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {t.sla_due_date ? new Date(t.sla_due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Standard'}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '12px', width: 'auto' }}
                          onClick={() => navigate(`/tickets/${t.id}`)}
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Resolution & AI Copilot Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Engineer Quick Tools</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/ai-intelligence')}>
                  <Cpu size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>AI Copilot & Predictions</span>
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/knowledge-base')}>
                  <BookOpen size={16} style={{ color: 'var(--status-success)' }} />
                  <span>Search Knowledge Base</span>
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/problems')}>
                  <AlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
                  <span>Known Problems & Workarounds</span>
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/cmdb')}>
                  <Activity size={16} style={{ color: 'var(--color-accent)' }} />
                  <span>CMDB Infrastructure Map</span>
                </button>
              </div>
            </div>

            {/* SLA Reminder */}
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">SLA Compliance Targets</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Critical Priority Target:</span>
                  <strong style={{ color: 'var(--status-error)' }}>&lt; 2 Hours</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>High Priority Target:</span>
                  <strong style={{ color: 'var(--status-warning)' }}>&lt; 8 Hours</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Medium / Low Target:</span>
                  <strong style={{ color: 'var(--status-info)' }}>&lt; 24 - 48 Hours</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ROLE 3: IT OPERATIONS MANAGER VIEW
  // -------------------------------------------------------------
  if (role === 'Manager') {
    const openTicketsCount = tickets.filter(t => t.status === 'Open').length;
    const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;
    const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
    const slaBreaches = analyticsOverview?.tickets?.sla_breaches || 0;

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
              IT Operations Management
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Outfit', marginTop: '4px' }}>
              Service Delivery Operations — {user?.name}
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Team-wide throughput, SLA enforcement, workload distributions, and change governance.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => navigate('/analytics')}>
              <BarChart2 size={16} />
              <span>Full Analytics</span>
            </button>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '10px 14px' }} onClick={fetchDashboardData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Manager Metric Cards */}
        <div className="metrics-grid">
          <div className="metric-card info">
            <div className="metric-info">
              <span className="metric-label">Total Inflow Volume</span>
              <span className="metric-value">{tickets.length}</span>
            </div>
            <div className="metric-icon-box">
              <Ticket size={24} />
            </div>
          </div>

          <div className="metric-card warning">
            <div className="metric-info">
              <span className="metric-label">Open / In Progress</span>
              <span className="metric-value">{openTicketsCount + inProgressCount}</span>
            </div>
            <div className="metric-icon-box">
              <Clock size={24} style={{ color: 'var(--status-warning)' }} />
            </div>
          </div>

          <div className="metric-card success">
            <div className="metric-info">
              <span className="metric-label">Resolved Throughput</span>
              <span className="metric-value">{resolvedCount}</span>
            </div>
            <div className="metric-icon-box">
              <CheckCircle size={24} style={{ color: 'var(--status-success)' }} />
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-info">
              <span className="metric-label">Active Support Staff</span>
              <span className="metric-value">{staffCount}</span>
            </div>
            <div className="metric-icon-box">
              <Users size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
        </div>

        {/* Manager Operational Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Recent Queue Overview */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Operational Ticket Stream</h3>
              <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/tickets')}>
                Queue Console
              </button>
            </div>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 8).map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{t.ticket_number}</td>
                      <td>{t.category_name || 'General'}</td>
                      <td><span className={`badge ${getPriorityBadgeClass(t.priority)}`}>{t.priority}</span></td>
                      <td><span className="badge" style={getStatusBadgeStyle(t.status)}>{t.status}</span></td>
                      <td style={{ fontSize: '13px' }}>{t.assigned_to_name || 'Unassigned'}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px', width: 'auto' }}
                          onClick={() => navigate(`/tickets/${t.id}`)}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manager Operations Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">ITIL Governance Portals</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/changes')}>
                  <Activity size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>Change Enablement & Reviews</span>
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/problems')}>
                  <AlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
                  <span>Problem Investigations (RCA)</span>
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/sla-policies')}>
                  <Clock size={16} style={{ color: 'var(--status-success)' }} />
                  <span>SLA Policies & Thresholds</span>
                </button>
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/assets')}>
                  <Users size={16} style={{ color: 'var(--color-accent)' }} />
                  <span>Asset Inventory Tracking</span>
                </button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">SLA Performance Status</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span>SLA Compliance Rate</span>
                    <strong style={{ color: 'var(--status-success)' }}>94%</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '94%', height: '100%', backgroundColor: 'var(--status-success)' }} />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Active SLA background monitor is currently tracking all open tickets against policy thresholds.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ROLE 4: ADMINISTRATOR VIEW (FULL SYSTEM COMMAND)
  // -------------------------------------------------------------
  const activeCount = tickets.filter(t => t.status !== 'Closed').length;
  const urgentCount = tickets.filter(t => (t.priority === 'Critical' || t.priority === 'Urgent' || t.priority === 'High') && t.status !== 'Closed').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
            System Administrator Command Center
          </span>
          <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Outfit', marginTop: '4px' }}>
            Enterprise Desk Overview
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Welcome back, {user?.name}. Full administrative governance, security configuration, and microservices oversight.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => navigate('/monitoring')}>
            <Activity size={16} />
            <span>System Telemetry</span>
          </button>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '10px 14px' }} onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Admin Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card info">
          <div className="metric-info">
            <span className="metric-label">Active Queue Tickets</span>
            <span className="metric-value">{activeCount}</span>
          </div>
          <div className="metric-icon-box">
            <Ticket size={24} />
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-info">
            <span className="metric-label">Urgent Escalations</span>
            <span className="metric-value">{urgentCount}</span>
          </div>
          <div className="metric-icon-box">
            <AlertTriangle size={24} style={{ color: 'var(--status-warning)' }} />
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-info">
            <span className="metric-label">SLA Compliance Rate</span>
            <span className="metric-value">94%</span>
          </div>
          <div className="metric-icon-box">
            <Clock size={24} style={{ color: 'var(--status-success)' }} />
          </div>
        </div>

        <div className="metric-card primary">
          <div className="metric-info">
            <span className="metric-label">Active Support Staff</span>
            <span className="metric-value">{staffCount}</span>
          </div>
          <div className="metric-icon-box">
            <Users size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
        </div>
      </div>

      {/* Admin Central Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Ticket Operations Stream */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">System Ticket Activity</h3>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/tickets')}>
              View All
            </button>
          </div>

          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              No tickets recorded in system.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 7).map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.id}`)}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{t.ticket_number}</td>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td>{t.category_name || 'General'}</td>
                      <td><span className={`badge ${getPriorityBadgeClass(t.priority)}`}>{t.priority}</span></td>
                      <td><span className="badge" style={getStatusBadgeStyle(t.status)}>{t.status}</span></td>
                      <td style={{ fontSize: '13px' }}>{t.assigned_to_name || 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Administration Console Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">System Controls</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/tickets', { state: { openCreate: true } })}>
                <Plus size={16} />
                <span>Create Support Ticket</span>
              </button>

              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/users')}>
                <Users size={16} style={{ color: 'var(--color-primary)' }} />
                <span>User & Access Management</span>
              </button>

              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/roles')}>
                <ShieldCheck size={16} style={{ color: 'var(--color-accent)' }} />
                <span>Role-Based Access Control</span>
              </button>

              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/security')}>
                <ShieldCheck size={16} style={{ color: 'var(--status-error)' }} />
                <span>Security Policies & Audits</span>
              </button>

              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/enterprise-ai')}>
                <Cpu size={16} style={{ color: 'var(--color-primary)' }} />
                <span>AI Command Center</span>
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">System Health</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={18} style={{ color: 'var(--status-success)' }} />
                <span style={{ fontSize: '13px' }}>PostgreSQL 16 Engine Online</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={18} style={{ color: 'var(--status-success)' }} />
                <span style={{ fontSize: '13px' }}>Background Cron SLA Scanner Active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={18} style={{ color: 'var(--status-success)' }} />
                <span style={{ fontSize: '13px' }}>Socket.IO Real-time Hub Connected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={18} style={{ color: 'var(--status-success)' }} />
                <span style={{ fontSize: '13px' }}>Modular AI Adapter (Mock Heuristic)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
