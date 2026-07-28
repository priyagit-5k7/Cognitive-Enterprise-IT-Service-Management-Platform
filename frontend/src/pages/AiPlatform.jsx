import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Cpu, Plus, Send, Trash2, Zap, Search, BookOpen, Activity, ChevronRight, Sparkles } from 'lucide-react';
import api from '../services/api';

const AiPlatform = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState('mock');
  const [metrics, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [knowledgeResults, setKnowledgeResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchConversations(); fetchMetrics(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/ai-platform/conversations');
      setConversations(res.data.conversations || []);
      setProvider(res.data.provider || 'mock');
    } catch {}
  };

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/ai-platform/performance');
      setMetrics(res.data);
    } catch {}
  };

  const fetchMessages = async (convId) => {
    try {
      const res = await api.get(`/ai-platform/conversations/${convId}/messages`);
      setMessages(res.data.messages || []);
    } catch {}
  };

  const createConversation = async () => {
    try {
      const res = await api.post('/ai-platform/conversations', { title: 'New Chat' });
      const conv = res.data.conversation;
      setConversations(prev => [conv, ...prev]);
      setCurrentConvId(conv.id);
      setMessages([]);
    } catch {}
  };

  const selectConversation = (conv) => {
    setCurrentConvId(conv.id);
    fetchMessages(conv.id);
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentConvId || sending) return;
    const content = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content, created_at: new Date().toISOString() }]);
    setSending(true);
    try {
      const res = await api.post(`/ai-platform/conversations/${currentConvId}/messages`, { content });
      const aiMsg = res.data.message;
      setMessages(prev => [...prev, { role: 'assistant', content: aiMsg.content, created_at: aiMsg.created_at, provider: res.data.provider }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get response. Please try again.', created_at: new Date().toISOString(), error: true }]);
    } finally { setSending(false); }
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai-platform/conversations/${convId}`);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (currentConvId === convId) { setCurrentConvId(null); setMessages([]); }
    } catch {}
  };

  const searchKnowledge = async () => {
    if (!knowledgeQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/ai-platform/knowledge-search?query=${encodeURIComponent(knowledgeQuery)}`);
      setKnowledgeResults(res.data.results || []);
    } catch {}
    finally { setSearching(false); }
  };

  const providerColors = { mock: '#8B5CF6', openai: '#10B981', gemini: '#6366F1', ollama: '#F59E0B' };

  return (
    <div className="page-wrapper" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>AI Studio</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Provider: <span style={{ fontWeight: 700, color: providerColors[provider] || '#94a3b8' }}>{provider.toUpperCase()}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['chat', 'knowledge', 'metrics'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={tab === activeTab ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize: '13px', padding: '8px 16px', textTransform: 'capitalize' }}>
              {tab === 'chat' ? <><Cpu size={14} style={{ marginRight: '6px' }} />Chat</> : tab === 'knowledge' ? <><BookOpen size={14} style={{ marginRight: '6px' }} />Knowledge</> : <><Activity size={14} style={{ marginRight: '6px' }} />Metrics</>}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'chat' && (
        <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden' }}>
          {/* Conversations sidebar */}
          <div className="card" style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border,#e2e8f0)' }}>
              <button className="btn btn-primary" onClick={createConversation} style={{ width: '100%', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Plus size={14} /> New Chat
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {conversations.map(conv => (
                <div key={conv.id} onClick={() => selectConversation(conv)}
                  style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: currentConvId === conv.id ? '#6366F115' : 'transparent', border: currentConvId === conv.id ? '1px solid #6366F130' : '1px solid transparent', marginBottom: '4px', transition: 'all 0.15s' }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.title}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{conv.message_count || 0} messages</div>
                  </div>
                  <button onClick={(e) => deleteConversation(conv.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8', opacity: 0, marginLeft: '4px' }}
                    onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!currentConvId ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#94a3b8' }}>
                <Sparkles size={48} color="#6366F1" />
                <h3 style={{ margin: 0, color: '#64748b' }}>Start a Conversation</h3>
                <p style={{ margin: 0, textAlign: 'center', maxWidth: '300px' }}>Create a new chat or select an existing conversation to start using AI assistance</p>
                <button className="btn btn-primary" onClick={createConversation}>New Chat</button>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>
                      <Cpu size={32} color="#6366F1" />
                      <p>Ask anything about IT support, tickets, or ITSM processes...</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%', padding: '14px 18px', borderRadius: '18px',
                        background: msg.role === 'user' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'var(--card-bg, #f8fafc)',
                        color: msg.role === 'user' ? '#fff' : 'inherit',
                        border: msg.role === 'assistant' ? '1px solid var(--border,#e2e8f0)' : 'none',
                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                        borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}>
                        <div style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        {msg.provider && <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.6 }}>{msg.provider} · {new Date(msg.created_at).toLocaleTimeString()}</div>}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div style={{ display: 'flex' }}>
                      <div style={{ padding: '14px 18px', borderRadius: '18px', borderBottomLeftRadius: '4px', background: 'var(--card-bg, #f8fafc)', border: '1px solid var(--border,#e2e8f0)' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366F1', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div style={{ padding: '16px', borderTop: '1px solid var(--border,#e2e8f0)', display: 'flex', gap: '12px' }}>
                  <input
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="Ask about tickets, IT issues, ITSM processes..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <button className="btn btn-primary" onClick={sendMessage} disabled={sending || !input.trim()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'knowledge' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>Knowledge Base Semantic Search</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input className="form-input" style={{ flex: 1 }} placeholder="Search knowledge articles..." value={knowledgeQuery} onChange={e => setKnowledgeQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchKnowledge()} />
              <button className="btn btn-primary" onClick={searchKnowledge} disabled={searching} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={16} /> {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {knowledgeResults.map((r, i) => (
              <div key={i} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontWeight: 700 }}>{r.title}</h4>
                  <span style={{ fontSize: '12px', background: '#6366F115', color: '#6366F1', padding: '2px 10px', borderRadius: '99px', fontWeight: 600 }}>{r.category}</span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b' }}>{r.problem}</p>
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px 14px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px', color: '#065F46' }}>Solution: </span>
                  <span style={{ fontSize: '13px', color: '#064E3B' }}>{r.solution}</span>
                </div>
                {r.rank && <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>Relevance score: {parseFloat(r.rank).toFixed(4)}</div>}
              </div>
            ))}
            {knowledgeQuery && knowledgeResults.length === 0 && !searching && (
              <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <Search size={32} color="#94a3b8" />
                <p style={{ margin: '12px 0 0' }}>No matching knowledge articles found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total Conversations', value: metrics?.conversationStats?.total_conversations || 0, color: '#6366F1' },
              { label: 'Total Messages', value: metrics?.conversationStats?.total_messages || 0, color: '#10B981' },
              { label: 'Total AI Calls', value: metrics?.metrics?.reduce((sum, m) => sum + parseInt(m.total_calls || 0), 0) || 0, color: '#8B5CF6' },
              { label: 'Provider', value: (metrics?.currentProvider || 'mock').toUpperCase(), color: providerColors[metrics?.currentProvider] || '#94a3b8' },
            ].map(c => (
              <div key={c.label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {metrics?.metrics?.length > 0 && (
            <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px', fontWeight: 700 }}>Performance by Operation (Last 7 Days)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                    {['Provider', 'Operation', 'Calls', 'Success', 'Failed', 'Avg Latency', 'Total Tokens'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.metrics.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border,#e2e8f0)' }}>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 600, color: providerColors[m.provider] || '#64748b' }}>{m.provider}</span></td>
                      <td style={{ padding: '12px 14px', fontSize: '13px' }}>{m.operation}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}>{m.total_calls}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#10B981', fontWeight: 600 }}>{m.successful}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#EF4444', fontWeight: 600 }}>{m.failed}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px' }}>{Math.round(m.avg_latency_ms || 0)}ms</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px' }}>{Number(m.total_tokens || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiPlatform;
