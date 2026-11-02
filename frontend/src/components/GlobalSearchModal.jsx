import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Ticket, BookOpen, User, ArrowRight, Loader2, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const { authFetch, API_BASE, user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'tickets', 'knowledge', 'users'
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const executeSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/search?q=${encodeURIComponent(q.trim())}&type=all`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || {});
      }
    } catch (err) {
      console.error('[GlobalSearch] Error searching:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, API_BASE]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceTimer.current);
    if (val.trim().length >= 2) {
      setLoading(true);
      debounceTimer.current = setTimeout(() => {
        executeSearch(val);
      }, 300);
    } else {
      setResults(null);
      setLoading(false);
    }
  };

  const handleSelectResult = (path) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  const tickets = results?.tickets || [];
  const knowledge = results?.knowledge || [];
  const users = results?.users || [];
  const totalCount = tickets.length + knowledge.length + users.length;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        paddingLeft: '16px',
        paddingRight: '16px',
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 140px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <Search size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Type at least 2 characters to search tickets, knowledge base, users..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              color: 'var(--text-main)',
              fontFamily: 'inherit'
            }}
          />
          {loading && <Loader2 size={18} className="spin" style={{ color: 'var(--text-muted)' }} />}
          {query && !loading && (
            <button 
              onClick={() => { setQuery(''); setResults(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
            >
              <X size={16} />
            </button>
          )}
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-hover)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)'
          }}>
            ESC
          </span>
        </div>

        {/* Filter Pills */}
        {results && totalCount > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: 'var(--bg-app)',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '13px'
          }}>
            <button
              onClick={() => setActiveTab('all')}
              className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: '12px', height: 'auto' }}
            >
              All ({totalCount})
            </button>
            {tickets.length > 0 && (
              <button
                onClick={() => setActiveTab('tickets')}
                className={`btn ${activeTab === 'tickets' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '12px', height: 'auto' }}
              >
                Tickets ({tickets.length})
              </button>
            )}
            {knowledge.length > 0 && (
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`btn ${activeTab === 'knowledge' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '12px', height: 'auto' }}
              >
                Knowledge Base ({knowledge.length})
              </button>
            )}
            {users.length > 0 && (
              <button
                onClick={() => setActiveTab('users')}
                className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '12px', height: 'auto' }}
              >
                Users ({users.length})
              </button>
            )}
          </div>
        )}

        {/* Results Body */}
        <div style={{ overflowY: 'auto', padding: '12px 20px', minHeight: '140px' }}>
          {!query || query.trim().length < 2 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Command size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', fontWeight: 500 }}>Quick Search Command Palette</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Search tickets by number or title, find solutions in the knowledge base, or look up personnel.
              </p>
            </div>
          ) : loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Searching live database...
            </div>
          ) : totalCount === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '15px', fontWeight: 600 }}>No results found for "{query}"</p>
              <p style={{ fontSize: '13px', marginTop: '6px' }}>Try a different keyword or category name.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tickets Section */}
              {(activeTab === 'all' || activeTab === 'tickets') && tickets.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Tickets ({tickets.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {tickets.map(t => (
                      <div
                        key={t.id}
                        onClick={() => handleSelectResult(`/tickets/${t.id}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Ticket size={16} style={{ color: 'var(--color-primary)' }} />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>
                              <span style={{ color: 'var(--color-primary)', marginRight: '8px' }}>{t.ticket_number}</span>
                              {t.title}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Status: <span style={{ fontWeight: 500 }}>{t.status}</span> • Priority: <span style={{ fontWeight: 500 }}>{t.priority}</span> {t.client_name ? `• ${t.client_name}` : ''}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Knowledge Base Section */}
              {(activeTab === 'all' || activeTab === 'knowledge') && knowledge.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Knowledge Base Solutions ({knowledge.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {knowledge.map(k => (
                      <div
                        key={k.id}
                        onClick={() => handleSelectResult(`/knowledge-base`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--status-success)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <BookOpen size={16} style={{ color: 'var(--status-success)' }} />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{k.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Category: {k.category}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Users Section (Admin/Manager only) */}
              {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Users ({users.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {users.map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleSelectResult(`/users`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <User size={16} style={{ color: 'var(--color-accent)' }} />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{u.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {u.email} • Role: <strong style={{ color: 'var(--text-main)' }}>{u.role}</strong>
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-app)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          <span>Role view: <strong>{user?.role_name}</strong></span>
          <button 
            onClick={() => { onClose(); navigate(`/search?q=${encodeURIComponent(query)}`); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>Open Advanced Search Page</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
