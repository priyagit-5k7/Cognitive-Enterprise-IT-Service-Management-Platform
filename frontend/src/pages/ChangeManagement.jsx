import React, { useState, useEffect, useCallback } from 'react';
import { GitMerge, Plus, Search, AlertCircle, CheckCircle, X, Clock, Shield } from 'lucide-react';
import api from '../services/api';

const statusColors = { Draft: '#94a3b8', Submitted: '#F59E0B', Approved: '#10B981', 'In Progress': '#6366F1', Completed: '#10B981', Rejected: '#EF4444', Cancelled: '#94a3b8' };
const riskColors = { Low: '#10B981', Medium: '#F59E0B', High: '#EF4444', Critical: '#DC2626' };
const priorityColors = { Low: '#10B981', Medium: '#F59E0B', High: '#EF4444', Critical: '#DC2626' };

const ChangeManagement = () => {
  const [changes, setChanges] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('changeType', typeFilter);

      const [changesRes, statsRes] = await Promise.all([
        api.get(`/changes?${params}`),
        api.get('/changes/stats'),
      ]);
      setChanges(changesRes.data.changes || []);
      setTotal(changesRes.data.total || 0);
      setStats(statsRes.data.stats);
    } catch (err) {
      console.error('[ChangeManagement]', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (!form.id) {
        await api.post('/changes', form);
        showToast('Change request created');
      } else {
        await api.put(`/changes/${form.id}`, form);
        showToast('Change request updated');
      }
      setModal(null);
      setForm({});
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: 'Total', value: stats?.total || 0, color: '#6366F1' },
    { label: 'Pending Approval', value: stats?.submitted || 0, color: '#F59E0B' },
    { label: 'In Progress', value: stats?.in_progress || 0, color: '#8B5CF6' },
    { label: 'Completed', value: stats?.completed || 0, color: '#10B981' },
    { label: 'Emergency', value: stats?.emergency || 0, color: '#EF4444' },
    { label: 'High Risk', value: stats?.high_risk || 0, color: '#DC2626' },
  ];

  return (
    <div className="page-wrapper" style={{ padding: '24px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`, borderRadius: '12px', padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          {toast.type === 'error' ? <AlertCircle size={18} color="#EF4444" /> : <CheckCircle size={18} color="#10B981" />}
          <span style={{ fontSize: '14px', fontWeight: 500, color: toast.type === 'error' ? '#991B1B' : '#065F46' }}>{toast.message}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Change Management</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>ITIL RFC lifecycle · {total} total changes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ changeType: 'Normal', priority: 'Medium', riskLevel: 'Low', status: 'Draft' }); setModal('create'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> New RFC
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {statCards.map(c => (
          <div key={c.label} className="card" style={{ padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Search changes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {Object.keys(statusColors).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {['Normal', 'Standard', 'Emergency'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading changes...</div>
        ) : changes.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <GitMerge size={48} color="#94a3b8" />
            <h3 style={{ color: '#64748b', margin: '16px 0 8px' }}>No change requests found</h3>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                {['RFC #', 'Title', 'Type', 'Status', 'Priority', 'Risk', 'Requested By', 'Planned Start'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {changes.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)', cursor: 'pointer' }}
                  onClick={() => { setForm(c); setModal('edit'); }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', background: '#6366F115', color: '#6366F1', padding: '2px 8px', borderRadius: '4px' }}>{c.change_number}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px', maxWidth: '250px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', background: c.change_type === 'Emergency' ? '#FEF2F2' : '#F1F5F9', color: c.change_type === 'Emergency' ? '#EF4444' : '#64748b', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>{c.change_type}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: `${statusColors[c.status] || '#94a3b8'}20`, color: statusColors[c.status] || '#94a3b8' }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', color: priorityColors[c.priority] || '#64748b', fontWeight: 600 }}>{c.priority}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', color: riskColors[c.risk_level] || '#64748b', fontWeight: 600 }}>{c.risk_level}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{c.requested_by_name}</td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>{c.planned_start ? new Date(c.planned_start).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: '680px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>{modal === 'create' ? 'New Change Request (RFC)' : 'Edit Change Request'}</h2>
              <button onClick={() => { setModal(null); setForm({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Title *</label>
                  <input className="form-input" required value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Description *</label>
                  <textarea className="form-input" rows={3} required value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Change Type</label>
                    <select className="form-input" value={form.changeType || form.change_type || 'Normal'} onChange={e => setForm(f => ({ ...f, changeType: e.target.value }))}>
                      {['Normal', 'Standard', 'Emergency'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Priority</label>
                    <select className="form-input" value={form.priority || 'Medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Risk Level</label>
                    <select className="form-input" value={form.riskLevel || form.risk_level || 'Low'} onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))}>
                      {['Low', 'Medium', 'High', 'Critical'].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                {form.id && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Status</label>
                    <select className="form-input" value={form.status || 'Draft'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.keys(statusColors).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Implementation Plan</label>
                  <textarea className="form-input" rows={3} value={form.implementationPlan || form.implementation_plan || ''} onChange={e => setForm(f => ({ ...f, implementationPlan: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Rollback Plan</label>
                  <textarea className="form-input" rows={2} value={form.rollbackPlan || form.rollback_plan || ''} onChange={e => setForm(f => ({ ...f, rollbackPlan: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : 'Save RFC'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setModal(null); setForm({}); }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeManagement;
