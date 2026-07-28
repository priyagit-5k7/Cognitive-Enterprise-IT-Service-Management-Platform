import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Lock, Users, AlertCircle, CheckCircle, Shield, Key, Eye, Activity, ChevronRight } from 'lucide-react';
import api from '../services/api';

const SecurityManagement = () => {
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [passwordPolicy, setPasswordPolicy] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes, eventsRes, sessionsRes, policyRes] = await Promise.all([
        api.get('/security/stats'),
        api.get('/security/audit-logs?limit=20'),
        api.get('/security/events?isResolved=false'),
        api.get('/security/sessions'),
        api.get('/security/password-policy'),
      ]);
      setStats(statsRes.data.stats);
      setAuditLogs(logsRes.data.logs || []);
      setSecurityEvents(eventsRes.data.events || []);
      setSessions(sessionsRes.data.sessions || []);
      setPasswordPolicy(policyRes.data.policy?.policy_config || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResolveEvent = async (id) => {
    try {
      await api.post(`/security/events/${id}/resolve`);
      showToast('Event resolved');
      fetchData();
    } catch {
      showToast('Failed to resolve', 'error');
    }
  };

  const handleRevokeSession = async (id) => {
    try {
      await api.delete(`/security/sessions/${id}`);
      showToast('Session revoked');
      fetchData();
    } catch {
      showToast('Failed to revoke session', 'error');
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    try {
      await api.put('/security/password-policy', passwordPolicy);
      showToast('Policy updated');
    } catch {
      showToast('Failed to update policy', 'error');
    }
  };

  return (
    <div className="page-wrapper" style={{ padding: '24px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`, borderRadius: '12px', padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          {toast.type === 'error' ? <AlertCircle size={18} color="#EF4444" /> : <CheckCircle size={18} color="#10B981" />}
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Security Center</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>Enterprise security & audit logging</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Open Incidents', value: stats?.open_events || 0, color: stats?.open_events > 0 ? '#EF4444' : '#10B981', icon: AlertCircle },
          { label: 'High Severity', value: stats?.high_severity_open || 0, color: '#DC2626', icon: Shield },
          { label: 'Active Sessions', value: stats?.active_sessions || 0, color: '#6366F1', icon: Activity },
          { label: 'MFA Adoption', value: stats?.total_active_users ? `${Math.round((stats?.mfa_enabled_users / stats?.total_active_users) * 100)}%` : '0%', color: '#8B5CF6', icon: Lock },
          { label: 'Audit Events (24h)', value: stats?.audit_last_24h || 0, color: '#06B6D4', icon: Eye },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <c.icon size={20} color={c.color} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border,#e2e8f0)' }}>
        {['overview', 'audit-logs', 'sessions', 'policies'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 20px', fontSize: '14px',
            fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? '#6366F1' : '#64748b',
            borderBottom: `2px solid ${activeTab === tab ? '#6366F1' : 'transparent'}`, textTransform: 'capitalize',
          }}>{tab.replace('-', ' ')}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#EF4444" /> Unresolved Security Events
            </h3>
            {securityEvents.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No active security events</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {securityEvents.map(e => (
                  <div key={e.id} style={{ border: '1px solid var(--border,#e2e8f0)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{e.description}</div>
                      <span style={{ fontSize: '11px', background: e.severity === 'high' ? '#FEF2F2' : '#FFFBEB', color: e.severity === 'high' ? '#EF4444' : '#F59E0B', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>{e.severity}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>{e.event_type} · User: {e.user_name || 'System'} · IP: {e.ip_address}</div>
                    <button onClick={() => handleResolveEvent(e.id)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>Mark Resolved</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} color="#6366F1" /> Recent Audit Activity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {auditLogs.slice(0, 10).map(log => (
                <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{log.action}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{log.user_name || 'System'} · {log.resource_type}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                    <div>{new Date(log.created_at).toLocaleTimeString()}</div>
                    <div>{log.ip_address}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveTab('audit-logs')} style={{ background: 'none', border: 'none', color: '#6366F1', fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: 0, marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>View all logs <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {activeTab === 'audit-logs' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                {['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600 }}>{log.user_name || 'System'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px' }}><span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>{log.action}</span></td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{log.resource_type}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{log.ip_address}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: String(log.status_code).startsWith('2') ? '#10B981' : '#EF4444' }}>{log.status_code || 'N/A'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                {['IP Address', 'Device/Browser', 'Started', 'Last Active', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                  <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace' }}>{s.ip_address}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', maxWidth: '300px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.user_agent}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>{new Date(s.created_at).toLocaleString()}</td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>{new Date(s.last_activity).toLocaleString()}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: s.is_active ? '#D1FAE5' : '#F1F5F9', color: s.is_active ? '#065F46' : '#64748b', fontWeight: 600 }}>
                      {s.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {s.is_active && (
                      <button onClick={() => handleRevokeSession(s.id)} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', color: '#EF4444', borderColor: '#FECACA', background: '#FEF2F2' }}>Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="card" style={{ maxWidth: '600px', padding: '32px' }}>
          <h3 style={{ margin: '0 0 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={18} color="#8B5CF6" /> Password & Security Policy</h3>
          <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>Minimum Password Length</label>
              <input type="number" min="8" max="64" className="form-input" value={passwordPolicy.minLength || 8} onChange={e => setPasswordPolicy(p => ({ ...p, minLength: parseInt(e.target.value) }))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={passwordPolicy.requireUppercase ?? true} onChange={e => setPasswordPolicy(p => ({ ...p, requireUppercase: e.target.checked }))} />
                <span style={{ fontSize: '14px' }}>Require uppercase letters (A-Z)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={passwordPolicy.requireLowercase ?? true} onChange={e => setPasswordPolicy(p => ({ ...p, requireLowercase: e.target.checked }))} />
                <span style={{ fontSize: '14px' }}>Require lowercase letters (a-z)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={passwordPolicy.requireNumbers ?? true} onChange={e => setPasswordPolicy(p => ({ ...p, requireNumbers: e.target.checked }))} />
                <span style={{ fontSize: '14px' }}>Require numbers (0-9)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={passwordPolicy.requireSpecial ?? true} onChange={e => setPasswordPolicy(p => ({ ...p, requireSpecial: e.target.checked }))} />
                <span style={{ fontSize: '14px' }}>Require special characters (!@#$%)</span>
              </label>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px' }}>Password Expiration (Days)</label>
              <input type="number" min="0" className="form-input" placeholder="0 for never" value={passwordPolicy.maxAgeDays || 90} onChange={e => setPasswordPolicy(p => ({ ...p, maxAgeDays: parseInt(e.target.value) }))} />
            </div>
            <div style={{ marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>Save Policy</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SecurityManagement;
