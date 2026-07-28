import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Search, AlertCircle, CheckCircle, X, Link, TrendingUp } from 'lucide-react';
import api from '../services/api';

const ciTypes = ['Server', 'Workstation', 'Network Device', 'Application', 'Database', 'Service', 'Storage', 'Virtual Machine', 'Container', 'Other'];
const statusColors = { Active: '#10B981', Inactive: '#F59E0B', Decommissioned: '#94a3b8', Maintenance: '#6366F1' };

const CmdbPage = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const [iRes, sRes] = await Promise.all([api.get(`/cmdb?${params}`), api.get('/cmdb/stats')]);
      setItems(iRes.data.items || []);
      setStats(sRes.data.stats);
      setTypeDistribution(sRes.data.typeDistribution || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (!form.id) { await api.post('/cmdb', form); showToast('CI created'); }
      else { await api.put(`/cmdb/${form.id}`, form); showToast('CI updated'); }
      setModal(null); setForm({}); fetchData();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleImpactAnalysis = async (ciId) => {
    try {
      const res = await api.get(`/cmdb/${ciId}/impact`);
      const affected = res.data.affected;
      alert(`Impact Analysis: ${res.data.count} affected CIs\n\n${affected.map(a => `• ${a.name} (${a.type}) — Depth ${a.depth}`).join('\n') || 'No downstream dependencies found.'}`);
    } catch {
      showToast('Impact analysis failed', 'error');
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Configuration Management Database</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>CMDB · {stats?.total || 0} configuration items · {stats?.unique_types || 0} types</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ type: 'Server', status: 'Active', environment: 'Production' }); setModal('create'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Add CI
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total CIs', value: stats?.total || 0, color: '#6366F1' },
          { label: 'Active', value: stats?.active || 0, color: '#10B981' },
          { label: 'Inactive', value: stats?.inactive || 0, color: '#F59E0B' },
          { label: 'Decommissioned', value: stats?.decommissioned || 0, color: '#94a3b8' },
          { label: 'Business Services', value: stats?.business_services || 0, color: '#8B5CF6' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Type Distribution */}
      {typeDistribution.length > 0 && (
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>CI Type Distribution</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {typeDistribution.map(t => (
              <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#6366F110', borderRadius: '99px' }}>
                <span style={{ fontWeight: 700, color: '#6366F1' }}>{t.count}</span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{t.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Search CIs by name, ID, IP..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {ciTypes.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {Object.keys(statusColors).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading CIs...</div>
        : items.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <Database size={48} color="#94a3b8" />
            <h3 style={{ color: '#64748b', margin: '16px 0 8px' }}>No configuration items found</h3>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                {['CI ID', 'Name', 'Type', 'Status', 'Environment', 'IP Address', 'Hostname', 'Owner', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(ci => (
                <tr key={ci.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', background: '#8B5CF615', color: '#8B5CF6', padding: '2px 8px', borderRadius: '4px' }}>{ci.ci_id}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }} onClick={() => { setForm(ci); setModal('edit'); }}>{ci.name}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{ci.type}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: `${statusColors[ci.status] || '#94a3b8'}20`, color: statusColors[ci.status] || '#94a3b8' }}>{ci.status}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{ci.environment}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{ci.ip_address || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{ci.hostname || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{ci.owner_name || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => handleImpactAnalysis(ci.id)} title="Impact Analysis" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: '#8B5CF6' }}>
                      <TrendingUp size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>{modal === 'create' ? 'New Configuration Item' : 'Edit CI'}</h2>
              <button onClick={() => { setModal(null); setForm({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { key: 'name', label: 'Name *', required: true },
                  { key: 'hostname', label: 'Hostname' },
                  { key: 'ip_address', label: 'IP Address' },
                  { key: 'version', label: 'Version' },
                  { key: 'location', label: 'Location' },
                  { key: 'business_service', label: 'Business Service' },
                ].map(({ key, label, required }) => (
                  <div key={key}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>{label}</label>
                    <input className="form-input" required={required} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Type *</label>
                  <select className="form-input" required value={form.type || 'Server'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {ciTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Status</label>
                  <select className="form-input" value={form.status || 'Active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.keys(statusColors).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Environment</label>
                  <select className="form-input" value={form.environment || 'Production'} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
                    {['Production', 'Staging', 'Development', 'Testing', 'DR'].map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Description</label>
                <textarea className="form-input" rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : 'Save CI'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setModal(null); setForm({}); }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CmdbPage;
