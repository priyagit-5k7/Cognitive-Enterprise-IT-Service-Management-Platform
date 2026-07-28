import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, Filter, Cpu, Monitor, Server, Smartphone, AlertCircle, CheckCircle, X } from 'lucide-react';
import api from '../services/api';

const statusColors = { Available: '#10B981', 'In Use': '#6366F1', Maintenance: '#F59E0B', Retired: '#94a3b8', Lost: '#EF4444' };
const conditionColors = { Excellent: '#10B981', Good: '#6366F1', Fair: '#F59E0B', Poor: '#EF4444' };

const AssetManagement = () => {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null); // 'create' | { id }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const [assetsRes, statsRes, catsRes] = await Promise.all([
        api.get(`/assets?${params}`),
        api.get('/assets/stats'),
        api.get('/assets/categories'),
      ]);
      setAssets(assetsRes.data.assets || []);
      setTotal(assetsRes.data.total || 0);
      setStats(statsRes.data.stats);
      setCategories(catsRes.data.categories || []);
    } catch (err) {
      console.error('[AssetManagement]', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (modal === 'create') {
        await api.post('/assets', form);
        showToast('Asset created successfully');
      } else {
        await api.put(`/assets/${modal.id}`, form);
        showToast('Asset updated');
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
    { label: 'Total Assets', value: stats?.total_assets || 0, color: '#6366F1' },
    { label: 'Available', value: stats?.available || 0, color: '#10B981' },
    { label: 'In Use', value: stats?.in_use || 0, color: '#8B5CF6' },
    { label: 'Maintenance', value: stats?.maintenance || 0, color: '#F59E0B' },
    { label: 'Total Value', value: `$${Number(stats?.total_current_value || 0).toLocaleString()}`, color: '#06B6D4' },
    { label: 'Warranty Expired', value: stats?.warranty_expired || 0, color: '#EF4444' },
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
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Asset Management</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>{total} assets registered</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ status: 'Available', condition: 'Good' }); setModal('create'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {statCards.map(c => (
          <div key={c.label} className="card" style={{ padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading assets...</div>
        ) : assets.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <Package size={48} color="#94a3b8" />
            <h3 style={{ color: '#64748b', margin: '16px 0 8px' }}>No assets found</h3>
            <p style={{ color: '#94a3b8' }}>Register your first IT asset to get started</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                {['Asset Tag', 'Name', 'Category', 'Status', 'Condition', 'Assigned To', 'Location', 'Value'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)', cursor: 'pointer' }}
                  onClick={() => { setForm(asset); setModal({ id: asset.id }); }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', background: '#6366F115', color: '#6366F1', padding: '2px 8px', borderRadius: '4px' }}>{asset.asset_tag}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px' }}>{asset.name}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{asset.category_name || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: `${statusColors[asset.status] || '#94a3b8'}20`, color: statusColors[asset.status] || '#94a3b8' }}>{asset.status}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', color: conditionColors[asset.condition] || '#94a3b8' }}>{asset.condition || '—'}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{asset.assigned_to_name || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{asset.location || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600 }}>
                    {asset.current_value ? `$${Number(asset.current_value).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>{modal === 'create' ? 'Add New Asset' : 'Edit Asset'}</h2>
              <button onClick={() => { setModal(null); setForm({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { key: 'name', label: 'Asset Name *', required: true },
                  { key: 'model', label: 'Model' },
                  { key: 'manufacturer', label: 'Manufacturer' },
                  { key: 'serial_number', label: 'Serial Number' },
                  { key: 'location', label: 'Location' },
                  { key: 'purchase_cost', label: 'Purchase Cost ($)', type: 'number' },
                  { key: 'current_value', label: 'Current Value ($)', type: 'number' },
                  { key: 'ip_address', label: 'IP Address' },
                  { key: 'hostname', label: 'Hostname' },
                  { key: 'os_type', label: 'OS Type' },
                ].map(({ key, label, required, type }) => (
                  <div key={key}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>{label}</label>
                    <input type={type || 'text'} className="form-input" required={required} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Status</label>
                  <select className="form-input" value={form.status || 'Available'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Condition</label>
                  <select className="form-input" value={form.condition || 'Good'} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                    {['Excellent', 'Good', 'Fair', 'Poor'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : 'Save Asset'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setModal(null); setForm({}); }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;
