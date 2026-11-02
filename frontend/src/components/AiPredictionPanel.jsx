import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  Brain, Target, Clock, Users, Lightbulb, RefreshCw,
  ChevronRight, Ticket, AlertTriangle, CheckCircle, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ExplainableAiWidget from './ExplainableAiWidget';

/**
 * AiPredictionPanel
 * Embeddable panel that displays AI analysis for a single ticket.
 * Used inside the TicketDetail page.
 *
 * Props:
 *   ticketId  - UUID of the ticket
 *   userRole  - current user's role name
 */
const AiPredictionPanel = ({ ticketId, userRole, onAssignEngineer }) => {
  const { authFetch, API_BASE, hasPermission } = useContext(AuthContext);
  const navigate = useNavigate();

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch(`${API_BASE}/ai/tickets/${ticketId}/prediction`);
      if (!res.ok) {
        if (res.status === 404) {
          setPrediction(null);
          return;
        }
        throw new Error('Failed to load AI prediction');
      }
      const data = await res.json();
      setPrediction(data.prediction);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reAnalyze = async () => {
    try {
      setReanalyzing(true);
      const res = await authFetch(`${API_BASE}/ai/tickets/${ticketId}/re-analyze`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Re-analysis failed');
      const data = await res.json();
      setPrediction(data.prediction);
    } catch (err) {
      setError(err.message);
    } finally {
      setReanalyzing(false);
    }
  };

  useEffect(() => {
    if (ticketId) fetchPrediction();
    // eslint-disable-next-line
  }, [ticketId]);

  const priorityColors = {
    Critical: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
    High: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
    Medium: { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' },
    Low: { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' }
  };

  const categoryIcons = {
    'Hardware Support': '🖥️',
    'Software Issues': '💻',
    'Network & Internet': '🌐',
    'Account & Access': '🔐',
    'General Request': '📋'
  };

  const getConfidenceStyle = (conf) => {
    if (conf >= 80) return { color: '#059669', bg: '#D1FAE5' };
    if (conf >= 50) return { color: '#D97706', bg: '#FEF3C7' };
    return { color: '#DC2626', bg: '#FEE2E2' };
  };

  const canReAnalyze = hasPermission('ai:re-analyze');

  return (
    <div style={styles.panel}>
      {/* Panel Header */}
      <div style={styles.panelHeader} onClick={() => setIsExpanded(p => !p)}>
        <div style={styles.panelHeaderLeft}>
          <div style={styles.aiIcon}>
            <Brain size={16} color="#fff" />
          </div>
          <div>
            <h3 style={styles.panelTitle}>AI Ticket Analysis</h3>
            <p style={styles.panelSubtitle}>Automated intelligence insights</p>
          </div>
        </div>
        <div style={styles.panelHeaderRight}>
          {prediction && (
            <span style={{ ...styles.confBadge, ...getConfidenceStyle(prediction.confidence) }}>
              {prediction.confidence}% confidence
            </span>
          )}
          <span style={styles.toggleIcon}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <div style={styles.panelBody}>
          {loading ? (
            <div style={styles.stateCenter}>
              <div style={styles.spinner} />
              <p style={styles.stateText}>Analyzing ticket...</p>
            </div>
          ) : error ? (
            <div style={styles.stateCenter}>
              <AlertTriangle size={28} color="#EF4444" />
              <p style={styles.errorText}>{error}</p>
              <button style={styles.retryBtn} onClick={fetchPrediction}>Retry</button>
            </div>
          ) : !prediction ? (
            <div style={styles.stateCenter}>
              <Brain size={28} color="#D1D5DB" />
              <p style={styles.stateText}>No AI analysis available yet.</p>
              {canReAnalyze && (
                <button style={styles.analyzeBtn} onClick={reAnalyze} disabled={reanalyzing}>
                  <Zap size={14} /> {reanalyzing ? 'Analyzing...' : 'Run Analysis'}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Category & Priority Row */}
              <div style={styles.primaryRow}>
                <div style={styles.predictionItem}>
                  <span style={styles.predLabel}>
                    <Target size={13} /> Predicted Category
                  </span>
                  <span style={styles.predValue}>
                    {categoryIcons[prediction.predicted_category] || '📁'}{' '}
                    {prediction.predicted_category}
                  </span>
                </div>

                <div style={styles.predictionItem}>
                  <span style={styles.predLabel}>
                    <AlertTriangle size={13} /> Predicted Priority
                  </span>
                  {prediction.predicted_priority && (
                    <span style={{
                      ...styles.priorityPill,
                      background: (priorityColors[prediction.predicted_priority] || {}).bg || '#F3F4F6',
                      color: (priorityColors[prediction.predicted_priority] || {}).text || '#374151',
                      border: `1px solid ${(priorityColors[prediction.predicted_priority] || {}).border || '#E5E7EB'}`
                    }}>
                      {prediction.predicted_priority}
                    </span>
                  )}
                </div>

                <div style={styles.predictionItem}>
                  <span style={styles.predLabel}>
                    <Clock size={13} /> Est. Resolution
                  </span>
                  <span style={styles.predValue}>{prediction.estimated_resolution_time}</span>
                </div>
              </div>

              {/* Recommended Engineers (Multiple candidates ranked by specialization & workload) */}
              {prediction.recommendations && prediction.recommendations.length > 0 ? (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Users size={13} color="#6366F1" /> Recommended Engineers
                    </span>
                    <span style={{ fontSize: '10px', color: '#6366F1', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      AI Ranked
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {prediction.recommendations.slice(0, 3).map((rec, idx) => (
                      <div
                        key={rec.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: idx === 0 ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-hover)',
                          border: `1px solid ${idx === 0 ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-color)'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: idx === 0 ? '#6366F1' : 'var(--border-color)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {rec.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {rec.name}
                              </p>
                              {idx === 0 && (
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                                  Top Pick
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                              {rec.specialization} • <strong style={{ color: 'var(--text-main)' }}>{rec.openTickets}</strong> open
                            </p>
                          </div>
                        </div>

                        {onAssignEngineer && ['Admin', 'Manager', 'Team Lead'].includes(userRole) && (
                          <button
                            type="button"
                            onClick={() => onAssignEngineer(rec.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: idx === 0 ? '#6366F1' : 'transparent',
                              color: idx === 0 ? '#FFFFFF' : 'var(--text-main)',
                              border: `1px solid ${idx === 0 ? '#6366F1' : 'var(--border-color)'}`,
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginLeft: '8px',
                              transition: 'all 0.2s'
                            }}
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : prediction.recommended_engineer_name ? (
                <div style={styles.engineerBlock}>
                  <div style={styles.engineerLeft}>
                    <div style={styles.engineerAvatar}>
                      {prediction.recommended_engineer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={styles.engineerName}>{prediction.recommended_engineer_name}</p>
                      <p style={styles.engineerLabel}>Recommended Engineer</p>
                    </div>
                  </div>
                  <Users size={16} color="#6366F1" />
                </div>
              ) : null}

              {/* Suggested Resolution */}
              {prediction.suggested_resolution && (
                <div style={styles.resolutionBlock}>
                  <div style={styles.resolutionHeader}>
                    <Lightbulb size={15} color="#F59E0B" />
                    <span style={styles.resolutionTitle}>Suggested Resolution</span>
                  </div>
                  <div style={styles.resolutionText}>
                    {prediction.suggested_resolution.split('\n').map((line, i) => (
                      <p key={i} style={styles.resolutionLine}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Tickets */}
              {prediction.similar_tickets && (() => {
                let similar = [];
                try {
                  similar = typeof prediction.similar_tickets === 'string'
                    ? JSON.parse(prediction.similar_tickets)
                    : prediction.similar_tickets;
                } catch { similar = []; }
                return similar.length > 0 ? (
                  <div style={styles.similarBlock}>
                    <div style={styles.resolutionHeader}>
                      <Ticket size={14} color="#6B7280" />
                      <span style={styles.similarTitle}>Similar Past Tickets ({similar.length})</span>
                    </div>
                    <div style={styles.similarList}>
                      {similar.map(st => (
                        <div
                          key={st.id}
                          style={styles.similarItem}
                          onClick={() => navigate(`/tickets/${st.id}`)}
                        >
                          <span style={styles.similarNum}>#{st.ticketNumber}</span>
                          <span style={styles.similarTitle2}>{st.title}</span>
                          <span style={{
                            ...styles.similarStatus,
                            color: st.status === 'Closed' || st.status === 'Resolved' ? '#10B981' : '#6B7280'
                          }}>
                            {st.status}
                          </span>
                          <ChevronRight size={13} color="#9CA3AF" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Actions Row */}
              <div style={styles.actionsRow}>
                <button
                  style={styles.kbBtn}
                  onClick={() => navigate('/knowledge-base')}
                >
                  <Brain size={13} /> Browse Knowledge Base
                </button>

                {canReAnalyze && (
                  <button
                    style={styles.reanalyzeBtn}
                    onClick={reAnalyze}
                    disabled={reanalyzing}
                  >
                    <RefreshCw size={13} style={{ animation: reanalyzing ? 'spin 1s linear infinite' : 'none' }} />
                    {reanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
                  </button>
                )}
              </div>

              {/* Explainable AI Widget (Phase 38) */}
              {prediction.dlMetadata && (
                <ExplainableAiWidget prediction={prediction} />
              )}
            </>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const styles = {
  panel: {
    background: '#fff', border: '1px solid #DDD6FE', borderRadius: '14px',
    overflow: 'hidden', boxShadow: '0 2px 12px rgba(99,102,241,0.08)',
    marginBottom: '20px'
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', cursor: 'pointer',
    background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
    borderBottom: '1px solid #DDD6FE'
  },
  panelHeaderLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  aiIcon: {
    width: '34px', height: '34px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
  },
  panelTitle: { fontSize: '14px', fontWeight: 700, color: '#4F46E5', margin: 0 },
  panelSubtitle: { fontSize: '11px', color: '#6B7280', margin: '2px 0 0' },
  panelHeaderRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  confBadge: {
    padding: '3px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600
  },
  toggleIcon: { fontSize: '11px', color: '#9CA3AF' },
  panelBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  stateCenter: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '24px', gap: '10px'
  },
  spinner: {
    width: '28px', height: '28px', borderRadius: '50%',
    border: '3px solid #E5E7EB', borderTop: '3px solid #6366F1',
    animation: 'spin 1s linear infinite'
  },
  stateText: { fontSize: '13px', color: '#6B7280', margin: 0 },
  errorText: { fontSize: '13px', color: '#EF4444', margin: 0 },
  retryBtn: {
    padding: '6px 14px', background: '#6366F1', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
  },
  analyzeBtn: {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '8px 16px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500
  },
  primaryRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px'
  },
  predictionItem: {
    background: '#F9FAFB', border: '1px solid #F3F4F6',
    borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px'
  },
  predLabel: {
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase'
  },
  predValue: { fontSize: '13px', fontWeight: 600, color: '#111827' },
  priorityPill: {
    padding: '4px 10px', borderRadius: '8px', fontSize: '12px',
    fontWeight: 600, display: 'inline-block'
  },
  engineerBlock: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '10px', padding: '12px 16px'
  },
  engineerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  engineerAvatar: {
    width: '34px', height: '34px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    color: '#fff', fontSize: '14px', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  engineerName: { fontSize: '13px', fontWeight: 600, color: '#4F46E5', margin: 0 },
  engineerLabel: { fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0' },
  resolutionBlock: {
    background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px'
  },
  resolutionHeader: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' },
  resolutionTitle: { fontSize: '13px', fontWeight: 600, color: '#92400E' },
  resolutionText: { display: 'flex', flexDirection: 'column', gap: '3px' },
  resolutionLine: { fontSize: '13px', color: '#6B7280', lineHeight: 1.5, margin: 0 },
  similarBlock: {
    border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden'
  },
  similarTitle: { fontSize: '12px', fontWeight: 600, color: '#6B7280' },
  similarList: { display: 'flex', flexDirection: 'column' },
  similarItem: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
    borderTop: '1px solid #F3F4F6', cursor: 'pointer',
    transition: 'background 0.15s'
  },
  similarNum: { fontSize: '12px', fontWeight: 600, color: '#6366F1', minWidth: '60px', fontFamily: 'monospace' },
  similarTitle2: {
    flex: 1, fontSize: '13px', color: '#374151', fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
  },
  similarStatus: { fontSize: '12px', fontWeight: 500 },
  actionsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' },
  kbBtn: {
    display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px',
    background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px',
    cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: '#6366F1'
  },
  reanalyzeBtn: {
    display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px',
    background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px',
    cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: '#6B7280'
  }
};

export default AiPredictionPanel;
