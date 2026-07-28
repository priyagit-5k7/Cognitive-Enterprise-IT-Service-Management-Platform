import React, { useState, useEffect, useCallback } from 'react';
import { Rocket, Plus, Search, AlertCircle, CheckCircle, X, Calendar } from 'lucide-react';
import api from '../services/api';

const statusColors = { Planning: '#94a3b8', Ready: '#6366F1', Testing: '#F59E0B', 'Deployed': '#10B981', 'Rolled Back': '#EF4444', Cancelled: '#94a3b8' };
const envColors = { Production: '#EF4444', Staging: '#F59E0B', Development: '#10B981', Testing: '#6366F1' };

const ReleaseManagement = () => {
  const [releases, setReleases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
      const [rRes, sRes] = await Promise.all([api.get(`/releases?${params}`), api.get('/releases/stats')]);
      setReleases(rRes.data.releases || []);
      setStats(sRes.data.stats);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (!form.id) { await api.post('/releases', form); showToast('Release created'); }
      else { await api.put(`/releases/${form.id}`, form); showToast('Release updated'); }
      setModal(null); setForm({}); fetchData();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-wrapper" style={{ padding: '24px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`, borderRadius: '12px', padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          {toast.type === 'error' ? <AlertCircle size={18} color="#EF4444" /> : <CheckCircle size={18} color="#10B981" />}
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Release Management</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>Deployment pipeline · {stats?.upcoming_week || 0} releases this week</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ releaseType: 'Minor', status: 'Planning', environment: 'Production' }); setModal('create'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> New Release
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: stats?.total || 0, color: '#6366F1' },
          { label: 'Planning', value: stats?.planning || 0, color: '#94a3b8' },
          { label: 'Ready', value: stats?.ready || 0, color: '#F59E0B' },
          { label: 'Deployed', value: stats?.deployed || 0, color: '#10B981' },
          { label: 'Rolled Back', value: stats?.rolled_back || 0, color: '#EF4444' },
          { label: 'This Week', value: stats?.upcoming_week || 0, color: '#8B5CF6' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Search releases..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {Object.keys(statusColors).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        : releases.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <Rocket size={48} color="#94a3b8" />
            <h3 style={{ color: '#64748b', margin: '16px 0 8px' }}>No releases found</h3>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                {['Release #', 'Title', 'Version', 'Type', 'Status', 'Environment', 'Tasks', 'Planned Date'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {releases.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)', cursor: 'pointer' }}
                  onClick={() => { setForm(r); setModal('edit'); }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', background: '#10B98115', color: '#10B981', padding: '2px 8px', borderRadius: '4px' }}>{r.release_number}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px' }}>{r.title}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>v{r.version}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{r.release_type}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: `${statusColors[r.status] || '#94a3b8'}20`, color: statusColors[r.status] || '#94a3b8' }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: envColors[r.environment] || '#64748b' }}>{r.environment}</span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{r.completed_tasks || 0}/{r.task_count || 0}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>
                    {r.planned_date ? new Date(r.planned_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>{modal === 'create' ? 'New Release' : 'Edit Release'}</h2>
              <button onClick={() => { setModal(null); setForm({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Title *</label>
                <input className="form-input" required value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Version *</label>
                  <input className="form-input" required placeholder="1.0.0" value={form.version || ''} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Release Type</label>
                  <select className="form-input" value={form.releaseType || form.release_type || 'Minor'} onChange={e => setForm(f => ({ ...f, releaseType: e.target.value }))}>
                    {['Major', 'Minor', 'Patch', 'Emergency'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Environment</label>
                  <select className="form-input" value={form.environment || 'Production'} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
                    {Object.keys(envColors).map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Status</label>
                  <select className="form-input" value={form.status || 'Planning'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.keys(statusColors).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Planned Date</label>
                <input type="date" className="form-input" value={form.plannedDate || form.planned_date?.split('T')[0] || ''} onChange={e => setForm(f => ({ ...f, plannedDate: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Release Notes</label>
                <textarea className="form-input" rows={3} value={form.releaseNotes || form.release_notes || ''} onChange={e => setForm(f => ({ ...f, releaseNotes: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : 'Save Release'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setModal(null); setForm({}); }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReleaseManagement;
