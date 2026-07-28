import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, Clock, Save, AlertCircle, CheckCircle } from 'lucide-react';

const SlaPolicies = () => {
  const { authFetch, API_BASE, hasPermission } = useContext(AuthContext);
  const [policies, setPolicies] = parseInt([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPolicies();
    // eslint-disable-next-line
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/sla`);
      if (!res.ok) throw new Error('Failed to load SLA policies');
      const data = await res.json();
      setPolicies(data.policies);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, field, value) => {
    const updated = policies.map(p => p.id === id ? { ...p, [field]: value } : p);
    setPolicies(updated);
  };

  const savePolicy = async (policy) => {
    try {
      setSaving(true);
      setError('');
      const res = await authFetch(`${API_BASE}/sla/${policy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      });
      if (!res.ok) throw new Error(`Failed to save policy: ${policy.priority}`);
      setSuccess(`SLA Policy for ${policy.priority} saved successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('manage_users')) {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={styles.errorTitle}>Access Denied</h2>
        <p style={styles.errorText}>You do not have permission to view SLA Policies.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrapper}>
            <Clock size={24} color="#6366F1" />
          </div>
          <div>
            <h1 style={styles.title}>Service Level Agreements</h1>
            <p style={styles.subtitle}>Configure target response and resolution times based on ticket priority.</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={styles.alertError}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div style={styles.alertSuccess}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Loading policies...</div>
      ) : (
        <div style={styles.grid}>
          {policies.map(policy => (
            <div key={policy.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{policy.priority} Priority</h3>
                <span style={styles.activeBadge(policy.is_active)}>
                  {policy.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Response Time (Minutes)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={policy.response_time_minutes}
                    onChange={(e) => handleUpdate(policy.id, 'response_time_minutes', parseInt(e.target.value) || 0)}
                  />
                  <p style={styles.hint}>Time limit for first response.</p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Resolution Time (Minutes)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={policy.resolution_time_minutes}
                    onChange={(e) => handleUpdate(policy.id, 'resolution_time_minutes', parseInt(e.target.value) || 0)}
                  />
                  <p style={styles.hint}>Time limit to resolve the ticket.</p>
                </div>
              </div>

              <div style={styles.cardFooter}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={policy.is_active}
                    onChange={(e) => handleUpdate(policy.id, 'is_active', e.target.checked)}
                  />
                  Policy Enabled
                </label>
                <button
                  style={styles.saveBtn}
                  onClick={() => savePolicy(policy)}
                  disabled={saving}
                >
                  <Save size={14} /> Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', marginBottom: '24px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  iconWrapper: {
    width: '48px', height: '48px', borderRadius: '12px',
    background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  title: { fontSize: '24px', fontWeight: 700, margin: 0, color: '#111827' },
  subtitle: { fontSize: '14px', color: '#6B7280', margin: '4px 0 0' },
  alertError: {
    padding: '12px 16px', background: '#FEF2F2', color: '#DC2626',
    borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'
  },
  alertSuccess: {
    padding: '12px 16px', background: '#ECFDF5', color: '#059669',
    borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'
  },
  loading: { textAlign: 'center', padding: '40px', color: '#6B7280' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
  card: {
    background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px',
    overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column'
  },
  cardHeader: {
    padding: '16px 20px', borderBottom: '1px solid #E5E7EB',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB'
  },
  cardTitle: { fontSize: '15px', fontWeight: 600, margin: 0, color: '#111827' },
  activeBadge: (active) => ({
    padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
    background: active ? '#D1FAE5' : '#F3F4F6', color: active ? '#059669' : '#6B7280'
  }),
  cardBody: { padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151' },
  input: {
    padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px'
  },
  hint: { fontSize: '11px', color: '#9CA3AF', margin: 0 },
  cardFooter: {
    padding: '16px 20px', borderTop: '1px solid #E5E7EB', background: '#FAFAFA',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4B5563', cursor: 'pointer' },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
    background: '#6366F1', color: '#fff', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontSize: '13px', fontWeight: 500
  },
  errorContainer: { textAlign: 'center', padding: '100px 20px' },
  errorTitle: { fontSize: '24px', fontWeight: 700, margin: '0 0 8px', color: '#111827' },
  errorText: { color: '#6B7280' }
};

export default SlaPolicies;
