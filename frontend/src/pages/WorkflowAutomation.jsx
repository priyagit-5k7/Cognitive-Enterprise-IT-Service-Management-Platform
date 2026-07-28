import React, { useState, useEffect, useCallback } from 'react';
import { Workflow, Plus, Play, Trash2, Search, CheckCircle, XCircle, Clock, AlertCircle, X, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../services/api';

const WorkflowAutomation = () => {
  const [workflows, setWorkflows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const [wRes, sRes] = await Promise.all([api.get(`/workflows${params}`), api.get('/workflows/stats')]);
      setWorkflows(wRes.data.workflows || []);
      setStats(sRes.data.stats);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (!form.id) { await api.post('/workflows', form); showToast('Workflow created'); }
      else { await api.put(`/workflows/${form.id}`, form); showToast('Workflow updated'); }
      setModal(null); setForm({}); fetchData();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleExecute = async (wf) => {
    setExecuting(wf.id);
    try {
      const res = await api.post(`/workflows/${wf.id}/execute`, { triggerData: {} });
      showToast(`Workflow "${wf.name}" executed: ${res.data.result.status}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Execution failed', 'error');
    } finally { setExecuting(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      showToast('Workflow deleted');
      fetchData();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleToggle = async (wf) => {
    try {
      await api.put(`/workflows/${wf.id}`, { isActive: !wf.is_active });
      showToast(`Workflow ${!wf.is_active ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch { showToast('Toggle failed', 'error'); }
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
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Workflow Automation</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>Automate IT processes · {stats?.active_workflows || 0} active workflows</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ triggerType: 'manual', category: 'General' }); setModal('create'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> New Workflow
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: stats?.total_workflows || 0, color: '#6366F1' },
          { label: 'Active', value: stats?.active_workflows || 0, color: '#10B981' },
          { label: 'Executions', value: stats?.total_executions || 0, color: '#8B5CF6' },
          { label: 'Successful', value: stats?.successful || 0, color: '#10B981' },
          { label: 'Failed', value: stats?.failed || 0, color: '#EF4444' },
          { label: 'Last 24h', value: stats?.last_24h || 0, color: '#F59E0B' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Search workflows..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <div className="card" style={{ padding: '80px', textAlign: 'center' }}>
          <Workflow size={48} color="#94a3b8" />
          <h3 style={{ color: '#64748b', margin: '16px 0 8px' }}>No workflows found</h3>
          <p style={{ color: '#94a3b8' }}>Create your first automation workflow</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {workflows.map(wf => (
            <div key={wf.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{wf.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{wf.description || 'No description'}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', background: '#6366F115', color: '#6366F1', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>{wf.trigger_type}</span>
                    <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#64748b', padding: '2px 8px', borderRadius: '99px' }}>{wf.category}</span>
                    <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#64748b', padding: '2px 8px', borderRadius: '99px' }}>{wf.step_count || 0} steps</span>
                  </div>
                </div>
                <button onClick={() => handleToggle(wf)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: wf.is_active ? '#10B981' : '#94a3b8' }}>
                  {wf.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border,#e2e8f0)' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {wf.execution_count || 0} runs · {wf.failure_count || 0} failed
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleExecute(wf)} disabled={!wf.is_active || executing === wf.id} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Play size={12} /> {executing === wf.id ? 'Running...' : 'Run'}
                  </button>
                  <button onClick={() => { setForm(wf); setModal('edit'); }} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Edit</button>
                  <button onClick={() => handleDelete(wf.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#EF4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>{modal === 'create' ? 'New Workflow' : 'Edit Workflow'}</h2>
              <button onClick={() => { setModal(null); setForm({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Workflow Name *</label>
                <input className="form-input" required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Description</label>
                <textarea className="form-input" rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Trigger Type</label>
                  <select className="form-input" value={form.triggerType || form.trigger_type || 'manual'} onChange={e => setForm(f => ({ ...f, triggerType: e.target.value }))}>
                    {['manual', 'ticket_created', 'ticket_updated', 'sla_breach', 'schedule'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Category</label>
                  <select className="form-input" value={form.category || 'General'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {['General', 'Ticketing', 'Notifications', 'Escalation', 'Onboarding', 'Offboarding'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : 'Save Workflow'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setModal(null); setForm({}); }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowAutomation;
