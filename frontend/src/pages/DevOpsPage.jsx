import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, Plus, Search, CheckCircle, AlertCircle, X, Activity } from 'lucide-react';
import api from '../services/api';

const deployStatusColors = { Running: '#6366F1', Success: '#10B981', Failed: '#EF4444', Cancelled: '#94a3b8', 'Rolled Back': '#F59E0B' };

const DevOpsPage = () => {
  const [integrations, setIntegrations] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [intRes, pipRes, depRes, statRes] = await Promise.all([
        api.get('/devops/integrations'),
        api.get('/devops/pipelines'),
        api.get('/devops/deployments'),
        api.get('/devops/stats'),
      ]);
      setIntegrations(intRes.data.integrations || []);
      setPipelines(pipRes.data.pipelines || []);
      setDeployments(depRes.data.deployments || []);
      setStats(statRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveIntegration = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/devops/integrations', form);
      showToast('Integration added');
      setModal(null); setForm({}); fetchData();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/devops/deployments', form);
      showToast('Deployment started');
      setModal(null); setForm({}); fetchData();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  const pipelineStatusColors = { Running: '#6366F1', Success: '#10B981', Failed: '#EF4444', Cancelled: '#94a3b8', Unknown: '#F59E0B' };

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
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>DevOps Integration</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>CI/CD · {stats?.integrations?.total || 0} integrations · {stats?.deployments?.last_24h || 0} deploys today</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => { setForm({ environment: 'Production' }); setModal('deploy'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} /> New Deployment
          </button>
          <button className="btn btn-primary" onClick={() => { setForm({ provider: 'Jenkins' }); setModal('integration'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={14} /> Add Integration
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Integrations', value: stats?.integrations?.total || 0, sub: `${stats?.integrations?.active || 0} active`, color: '#6366F1' },
          { label: 'Pipelines', value: stats?.pipelines?.total || 0, sub: `${stats?.pipelines?.successful || 0} successful`, color: '#10B981' },
          { label: 'Deployments', value: stats?.deployments?.total || 0, sub: `${stats?.deployments?.last_24h || 0} today`, color: '#8B5CF6' },
          { label: 'Success Rate', value: stats?.deployments?.total > 0 ? `${Math.round((stats?.deployments?.successful / stats?.deployments?.total) * 100) || 0}%` : '—', sub: `${stats?.deployments?.failed || 0} failed`, color: '#F59E0B' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>{c.label}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border,#e2e8f0)' }}>
        {['overview', 'integrations', 'pipelines', 'deployments'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 20px', fontSize: '14px',
            fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? '#6366F1' : '#64748b',
            borderBottom: `2px solid ${activeTab === tab ? '#6366F1' : 'transparent'}`, textTransform: 'capitalize',
          }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'integrations' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {integrations.length === 0 ? (
            <div className="card" style={{ padding: '60px', textAlign: 'center', gridColumn: '1/-1' }}>
              <GitBranch size={48} color="#94a3b8" />
              <h3 style={{ color: '#64748b', margin: '16px 0 8px' }}>No integrations yet</h3>
            </div>
          ) : integrations.map(integ => (
            <div key={integ.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontWeight: 700 }}>{integ.name}</h4>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: integ.is_active ? '#10B981' : '#94a3b8', display: 'inline-block', marginTop: '4px' }} />
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Provider: <span style={{ fontWeight: 600, color: '#6366F1' }}>{integ.provider}</span></div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Added by {integ.created_by_name} · {new Date(integ.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'pipelines' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {pipelines.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center' }}>
              <Activity size={48} color="#94a3b8" />
              <h3 style={{ color: '#64748b', margin: '16px 0 8px' }}>No pipelines registered</h3>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                  {['Pipeline', 'Integration', 'Repository', 'Branch', 'Status', 'Last Run'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipelines.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{p.pipeline_name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.integration_name} ({p.provider})</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{p.repository || '—'}</td>
                    <td style={{ padding: '14px 16px' }}><span style={{ fontSize: '12px', background: '#6366F115', color: '#6366F1', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>{p.branch}</span></td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: `${pipelineStatusColors[p.status] || '#94a3b8'}20`, color: pipelineStatusColors[p.status] || '#94a3b8' }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>{p.last_run_at ? new Date(p.last_run_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'deployments' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {deployments.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center' }}>
              <GitBranch size={48} color="#94a3b8" />
              <h3 style={{ color: '#64748b', margin: '16px 0 8px' }}>No deployments yet</h3>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                  {['Pipeline', 'Environment', 'Version', 'Status', 'Deployed By', 'Started', 'Completed'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deployments.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px' }}>{d.pipeline_name || 'Manual'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: d.environment === 'Production' ? '#EF444420' : '#6366F120', color: d.environment === 'Production' ? '#EF4444' : '#6366F1' }}>{d.environment}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{d.version || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: `${deployStatusColors[d.status] || '#94a3b8'}20`, color: deployStatusColors[d.status] || '#94a3b8' }}>{d.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{d.deployed_by_name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>{new Date(d.created_at).toLocaleString()}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>{d.completed_at ? new Date(d.completed_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>Recent Deployments</h3>
            {deployments.slice(0, 5).map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{d.pipeline_name || 'Manual Deploy'} → <span style={{ color: d.environment === 'Production' ? '#EF4444' : '#6366F1' }}>{d.environment}</span></div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{d.deployed_by_name} · {new Date(d.created_at).toLocaleDateString()}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: `${deployStatusColors[d.status] || '#94a3b8'}20`, color: deployStatusColors[d.status] || '#94a3b8' }}>{d.status}</span>
              </div>
            ))}
            {deployments.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', margin: '40px 0' }}>No deployments yet</p>}
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>Active Integrations</h3>
            {integrations.filter(i => i.is_active).map(integ => (
              <div key={integ.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#6366F120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GitBranch size={18} color="#6366F1" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{integ.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{integ.provider}</div>
                </div>
                <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              </div>
            ))}
            {integrations.filter(i => i.is_active).length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', margin: '40px 0' }}>No active integrations</p>}
          </div>
        </div>
      )}

      {/* Integration Modal */}
      {modal === 'integration' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>Add Integration</h2>
              <button onClick={() => { setModal(null); setForm({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveIntegration} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Name *</label>
                <input className="form-input" required placeholder="e.g. Production Jenkins" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Provider *</label>
                <select className="form-input" required value={form.provider || 'Jenkins'} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
                  {['Jenkins', 'GitLab CI', 'GitHub Actions', 'Azure DevOps', 'CircleCI', 'Bitbucket', 'TeamCity', 'Other'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>API URL</label>
                <input className="form-input" placeholder="https://your-ci.example.com" value={form.apiUrl || ''} onChange={e => setForm(f => ({ ...f, config: { ...f.config, apiUrl: e.target.value } }))} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>API Token</label>
                <input className="form-input" type="password" placeholder="Stored securely" value={form.token || ''} onChange={e => setForm(f => ({ ...f, config: { ...f.config, token: e.target.value } }))} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : 'Add Integration'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setModal(null); setForm({}); }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {modal === 'deploy' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>New Deployment</h2>
              <button onClick={() => { setModal(null); setForm({}); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleDeploy} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Environment *</label>
                <select className="form-input" required value={form.environment || 'Production'} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
                  {['Production', 'Staging', 'Development', 'Testing', 'DR'].map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Version</label>
                <input className="form-input" placeholder="1.2.3" value={form.version || ''} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>Pipeline (optional)</label>
                <select className="form-input" value={form.pipelineId || ''} onChange={e => setForm(f => ({ ...f, pipelineId: e.target.value || null }))}>
                  <option value="">Manual deployment</option>
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.pipeline_name}</option>)}
                </select>
              </div>
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px' }}>
                <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: 600 }}>⚠ Production deployments cannot be undone automatically</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Deploying...' : 'Start Deployment'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setModal(null); setForm({}); }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevOpsPage;
