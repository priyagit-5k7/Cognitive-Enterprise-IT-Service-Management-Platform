import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, HardDrive, Cpu, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

const MonitoringDashboard = () => {
  const [health, setHealth] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSystemData = async () => {
    try {
      const [hRes, dbRes, aRes] = await Promise.all([
        api.get('/monitoring/system-health'),
        api.get('/monitoring/database'),
        api.get('/monitoring/alerts')
      ]);
      setHealth(hRes.data);
      setDbStats(dbRes.data);
      setAlerts(aRes.data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch system data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, []);

  if (loading && !health) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading system metrics...</div>;
  }

  const resolveAlert = async (id) => {
    try {
      await api.post(`/monitoring/alerts/${id}/resolve`);
      fetchSystemData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="page-wrapper" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>System Monitoring</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>Real-time platform health and performance</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: health?.status === 'healthy' ? '#D1FAE5' : '#FEF2F2', padding: '8px 16px', borderRadius: '99px', border: `1px solid ${health?.status === 'healthy' ? '#10B981' : '#EF4444'}` }}>
          {health?.status === 'healthy' ? <CheckCircle size={18} color="#059669" /> : <AlertCircle size={18} color="#DC2626" />}
          <span style={{ fontWeight: 700, fontSize: '13px', color: health?.status === 'healthy' ? '#059669' : '#DC2626', textTransform: 'uppercase' }}>
            System {health?.status}
          </span>
        </div>
      </div>

      {/* Core Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#64748b' }}>
            <Clock size={18} /> <span style={{ fontWeight: 600, fontSize: '14px' }}>Uptime</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800 }}>{health?.uptimeFormatted}</div>
        </div>
        
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#64748b' }}>
            <Cpu size={18} /> <span style={{ fontWeight: 600, fontSize: '14px' }}>CPU Load</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800 }}>{health?.system?.loadAverage[0]}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{health?.system?.cpus} Cores</div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#64748b' }}>
            <Server size={18} /> <span style={{ fontWeight: 600, fontSize: '14px' }}>Memory</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800 }}>{health?.system?.memoryUsagePercent}%</div>
          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${health?.system?.memoryUsagePercent}%`, background: health?.system?.memoryUsagePercent > 85 ? '#EF4444' : '#10B981' }} />
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{health?.system?.freeMemoryMB} MB Free / {health?.system?.totalMemoryMB} MB Total</div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#64748b' }}>
            <Database size={18} /> <span style={{ fontWeight: 600, fontSize: '14px' }}>Database</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: health?.database?.healthy ? '#10B981' : '#EF4444' }}>
            {health?.database?.latencyMs}ms
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>PostgreSQL connection</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* System Alerts */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#F59E0B" /> System Alerts
          </h3>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No active alerts</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alerts.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px', border: '1px solid var(--border,#e2e8f0)', borderRadius: '12px', background: !a.is_resolved && a.severity === 'critical' ? '#FEF2F2' : 'transparent' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{a.alert_type}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: a.severity === 'critical' ? '#EF4444' : a.severity === 'warning' ? '#F59E0B' : '#3B82F6', color: '#fff' }}>{a.severity}</span>
                      {a.is_resolved && <span style={{ fontSize: '10px', fontWeight: 700, background: '#10B98120', color: '#10B981', padding: '2px 6px', borderRadius: '4px' }}>RESOLVED</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{a.message}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  {!a.is_resolved && (
                    <button onClick={() => resolveAlert(a.id)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>Resolve</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Database Stats */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={18} color="#6366F1" /> Database Storage
          </h3>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#6366F1' }}>{dbStats?.database?.size || '0 MB'}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Total Database Size</div>
          </div>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Table Row Counts</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dbStats?.tables && Object.entries(dbStats.tables).map(([table, count]) => (
              <div key={table} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                <span style={{ fontSize: '13px', color: '#64748b', textTransform: 'capitalize' }}>{table.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
