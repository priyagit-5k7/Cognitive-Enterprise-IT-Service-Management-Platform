import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Brain, TrendingUp, BarChart2, Cpu, Zap, Target, Clock, Users,
  AlertTriangle, CheckCircle, Activity, RefreshCw, ChevronRight, Layers
} from 'lucide-react';

const AiIntelligence = () => {
  const { authFetch, API_BASE, hasPermission } = useContext(AuthContext);
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch(`${API_BASE}/ai/analytics`);
      if (!res.ok) throw new Error('Failed to load AI analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasPermission('ai:analytics')) {
      navigate('/dashboard');
      return;
    }
    fetchAnalytics();
    // eslint-disable-next-line
  }, []);

  const priorityColors = {
    Critical: { bg: '#FEE2E2', text: '#DC2626', bar: '#EF4444' },
    High: { bg: '#FEF3C7', text: '#D97706', bar: '#F59E0B' },
    Medium: { bg: '#DBEAFE', text: '#1D4ED8', bar: '#3B82F6' },
    Low: { bg: '#DCFCE7', text: '#15803D', bar: '#22C55E' }
  };

  const categoryIcons = {
    'Hardware Support': '🖥️',
    'Software Issues': '💻',
    'Network & Internet': '🌐',
    'Account & Access': '🔐',
    'General Request': '📋'
  };

  const totalCategoryCount = analytics
    ? analytics.categoryDistribution.reduce((s, c) => s + c.count, 0)
    : 0;

  const totalPriorityCount = analytics
    ? analytics.priorityDistribution.reduce((s, p) => s + p.count, 0)
    : 0;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Loading AI Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <AlertTriangle size={40} color="#EF4444" />
        <p style={styles.errorText}>{error}</p>
        <button style={styles.retryBtn} onClick={fetchAnalytics}>Retry</button>
      </div>
    );
  }

  const { summary, categoryDistribution, priorityDistribution, recentPredictions } = analytics || {};

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <Brain size={28} color="#fff" />
          </div>
          <div>
            <h1 style={styles.headerTitle}>AI Intelligence Dashboard</h1>
            <p style={styles.headerSubtitle}>Real-time analysis of ticket classification and resolution predictions</p>
          </div>
        </div>
        <button style={styles.refreshBtn} onClick={fetchAnalytics}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          icon={<Cpu size={22} color="#6366F1" />}
          value={summary?.totalPredictions || 0}
          label="Total Predictions"
          bgColor="#EEF2FF"
          textColor="#6366F1"
        />
        <StatCard
          icon={<Target size={22} color="#10B981" />}
          value={`${summary?.avgConfidence || 0}%`}
          label="Avg. Confidence"
          bgColor="#D1FAE5"
          textColor="#10B981"
        />
        <StatCard
          icon={<CheckCircle size={22} color="#3B82F6" />}
          value={summary?.highConfidenceCount || 0}
          label="High Confidence (≥80%)"
          bgColor="#DBEAFE"
          textColor="#1D4ED8"
        />
        <StatCard
          icon={<AlertTriangle size={22} color="#F59E0B" />}
          value={summary?.lowConfidenceCount || 0}
          label="Low Confidence (<50%)"
          bgColor="#FEF3C7"
          textColor="#D97706"
        />
      </div>

      {/* Charts Row */}
      <div style={styles.chartsRow}>
        {/* Category Distribution */}
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <Layers size={18} color="#6366F1" />
            <h3 style={styles.chartTitle}>Category Distribution</h3>
          </div>
          {categoryDistribution && categoryDistribution.length > 0 ? (
            <div style={styles.barList}>
              {categoryDistribution.map(item => {
                const pct = totalCategoryCount > 0 ? (item.count / totalCategoryCount) * 100 : 0;
                return (
                  <div key={item.category} style={styles.barRow}>
                    <div style={styles.barLabel}>
                      <span style={styles.barEmoji}>{categoryIcons[item.category] || '📁'}</span>
                      <span style={styles.barName}>{item.category}</span>
                    </div>
                    <div style={styles.barTrack}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                        }}
                      />
                    </div>
                    <span style={styles.barCount}>{item.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={styles.emptyText}>No category data yet. Create tickets to see AI predictions.</p>
          )}
        </div>

        {/* Priority Distribution */}
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <TrendingUp size={18} color="#F59E0B" />
            <h3 style={styles.chartTitle}>Priority Distribution</h3>
          </div>
          {priorityDistribution && priorityDistribution.length > 0 ? (
            <div style={styles.barList}>
              {priorityDistribution.map(item => {
                const pct = totalPriorityCount > 0 ? (item.count / totalPriorityCount) * 100 : 0;
                const colors = priorityColors[item.priority] || { bar: '#6B7280', bg: '#F3F4F6', text: '#374151' };
                return (
                  <div key={item.priority} style={styles.barRow}>
                    <div style={styles.barLabel}>
                      <span style={{ ...styles.priorityBadge, background: colors.bg, color: colors.text }}>
                        {item.priority}
                      </span>
                    </div>
                    <div style={styles.barTrack}>
                      <div
                        style={{ ...styles.barFill, width: `${pct}%`, background: colors.bar }}
                      />
                    </div>
                    <span style={styles.barCount}>{item.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={styles.emptyText}>No priority data yet. Create tickets to see AI predictions.</p>
          )}
        </div>
      </div>

      {/* Recent Predictions Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div style={styles.tableHeaderLeft}>
            <Activity size={18} color="#6366F1" />
            <h3 style={styles.tableTitle}>Recent AI Predictions</h3>
          </div>
          <button style={styles.viewAllBtn} onClick={() => navigate('/tickets')}>
            View All Tickets <ChevronRight size={14} />
          </button>
        </div>

        {recentPredictions && recentPredictions.length > 0 ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Ticket #', 'Title', 'Category', 'Priority', 'Confidence', 'Date'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPredictions.map((p, idx) => {
                  const prColors = priorityColors[p.predicted_priority] || { bg: '#F3F4F6', text: '#374151' };
                  const confColor = p.confidence >= 80 ? '#10B981' : p.confidence >= 50 ? '#F59E0B' : '#EF4444';
                  return (
                    <tr
                      key={p.ticket_id}
                      style={{ ...styles.tr, background: idx % 2 === 0 ? '#F9FAFB' : '#fff' }}
                      onClick={() => navigate(`/tickets/${p.ticket_id}`)}
                    >
                      <td style={styles.td}>
                        <span style={styles.ticketNum}>#{p.ticket_number}</span>
                      </td>
                      <td style={{ ...styles.td, maxWidth: '200px' }}>
                        <span style={styles.ticketTitle}>{p.title}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.categoryChip}>
                          {categoryIcons[p.predicted_category] || '📁'} {p.predicted_category}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.priorityChip, background: prColors.bg, color: prColors.text }}>
                          {p.predicted_priority}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.confidenceCell}>
                          <div style={{ ...styles.confDot, background: confColor }} />
                          <span style={{ color: confColor, fontWeight: 600, fontSize: '13px' }}>{p.confidence}%</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateText}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <Brain size={48} color="#D1D5DB" />
            <p style={styles.emptyStateText}>No AI predictions generated yet.</p>
            <p style={styles.emptyStateSubtext}>Create support tickets to activate AI analysis.</p>
            <button style={styles.createTicketBtn} onClick={() => navigate('/tickets')}>
              <Zap size={16} /> Go to Tickets
            </button>
          </div>
        )}
      </div>

      {/* AI Info Banner */}
      <div style={styles.infoBanner}>
        <div style={styles.infoBannerIcon}>
          <Brain size={20} color="#6366F1" />
        </div>
        <div style={styles.infoBannerContent}>
          <h4 style={styles.infoBannerTitle}>How AI Analysis Works</h4>
          <p style={styles.infoBannerText}>
            Every ticket is automatically analyzed using rule-based AI classification. The engine identifies category,
            predicts priority based on urgency keywords, searches the knowledge base for resolution suggestions,
            recommends the best available engineer based on workload, and detects similar past tickets — all within milliseconds.
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, value, label, bgColor, textColor }) => (
  <div style={styles.statCard}>
    <div style={{ ...styles.statIcon, background: bgColor }}>
      {icon}
    </div>
    <div>
      <div style={{ ...styles.statValue, color: textColor }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  </div>
);

const styles = {
  page: {
    padding: '28px 32px',
    maxWidth: '1280px',
    margin: '0 auto',
    fontFamily: "'Inter', 'Segoe UI', sans-serif"
  },
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '400px', gap: '16px'
  },
  loadingSpinner: {
    width: '40px', height: '40px', borderRadius: '50%',
    border: '4px solid #E5E7EB', borderTop: '4px solid #6366F1',
    animation: 'spin 1s linear infinite'
  },
  loadingText: { color: '#6B7280', fontSize: '15px' },
  errorContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '400px', gap: '16px'
  },
  errorText: { color: '#EF4444', fontSize: '15px', textAlign: 'center' },
  retryBtn: {
    padding: '10px 20px', background: '#6366F1', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '28px', flexWrap: 'wrap', gap: '16px'
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerIcon: {
    width: '52px', height: '52px', borderRadius: '14px',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
  },
  headerTitle: {
    fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0
  },
  headerSubtitle: { fontSize: '13px', color: '#6B7280', margin: '4px 0 0' },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '9px 16px', background: '#fff', border: '1px solid #E5E7EB',
    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
    color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px', marginBottom: '24px'
  },
  statCard: {
    background: '#fff', borderRadius: '12px', padding: '20px',
    display: 'flex', alignItems: 'center', gap: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6'
  },
  statIcon: {
    width: '48px', height: '48px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  statValue: { fontSize: '26px', fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: '12px', color: '#6B7280', marginTop: '4px', fontWeight: 500 },
  chartsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px', marginBottom: '24px'
  },
  chartCard: {
    background: '#fff', borderRadius: '14px', padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6'
  },
  chartHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' },
  chartTitle: { fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 },
  barList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  barRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  barLabel: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: '160px' },
  barEmoji: { fontSize: '16px' },
  barName: { fontSize: '13px', fontWeight: 500, color: '#374151' },
  barTrack: {
    flex: 1, height: '8px', background: '#F3F4F6',
    borderRadius: '999px', overflow: 'hidden'
  },
  barFill: { height: '100%', borderRadius: '999px', transition: 'width 0.6s ease' },
  barCount: { fontSize: '13px', fontWeight: 600, color: '#111827', minWidth: '28px', textAlign: 'right' },
  priorityBadge: {
    padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600
  },
  emptyText: { color: '#9CA3AF', fontSize: '13px', textAlign: 'center', marginTop: '20px' },
  tableCard: {
    background: '#fff', borderRadius: '14px', padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6',
    marginBottom: '24px'
  },
  tableHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '20px', flexWrap: 'wrap', gap: '12px'
  },
  tableHeaderLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  tableTitle: { fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 },
  viewAllBtn: {
    display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px',
    background: '#F5F3FF', color: '#6366F1', border: '1px solid #E0E7FF',
    borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 14px', textAlign: 'left', fontSize: '12px',
    fontWeight: 600, color: '#6B7280', textTransform: 'uppercase',
    letterSpacing: '0.05em', borderBottom: '1px solid #F3F4F6'
  },
  tr: { cursor: 'pointer', transition: 'background 0.15s' },
  td: { padding: '12px 14px', fontSize: '13px', color: '#374151', verticalAlign: 'middle' },
  ticketNum: { fontWeight: 600, color: '#6366F1', fontFamily: 'monospace', fontSize: '13px' },
  ticketTitle: {
    display: 'block', maxWidth: '200px', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500
  },
  categoryChip: { fontSize: '12px', color: '#374151', fontWeight: 500 },
  priorityChip: {
    padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600
  },
  confidenceCell: { display: 'flex', alignItems: 'center', gap: '6px' },
  confDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  dateText: { fontSize: '12px', color: '#6B7280' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px 20px', gap: '8px'
  },
  emptyStateText: { fontSize: '15px', fontWeight: 600, color: '#6B7280', margin: '8px 0 0' },
  emptyStateSubtext: { fontSize: '13px', color: '#9CA3AF', margin: 0 },
  createTicketBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px',
    padding: '10px 20px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
    fontSize: '14px', fontWeight: 500
  },
  infoBanner: {
    display: 'flex', alignItems: 'flex-start', gap: '16px',
    background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
    border: '1px solid #DDD6FE', borderRadius: '14px', padding: '20px 24px'
  },
  infoBannerIcon: {
    width: '40px', height: '40px', borderRadius: '10px', background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(99,102,241,0.2)', flexShrink: 0
  },
  infoBannerContent: {},
  infoBannerTitle: { fontSize: '14px', fontWeight: 600, color: '#4F46E5', margin: '0 0 6px' },
  infoBannerText: { fontSize: '13px', color: '#6B7280', lineHeight: 1.6, margin: 0 }
};

export default AiIntelligence;
