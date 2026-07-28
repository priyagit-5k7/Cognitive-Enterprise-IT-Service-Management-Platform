import React, { useState, useRef, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Bot, Send, User, Zap, BookOpen, Ticket, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Chatbot = () => {
  const { authFetch, API_BASE, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: `Hello ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your **AI Support Assistant**.\n\nI can help you with common IT issues like:\n• WiFi & network problems\n• Software crashes & errors\n• Password resets\n• Hardware issues\n• VPN connectivity\n\nWhat can I help you with today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: null,
      type_label: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickReplies = [
    "I can't connect to WiFi",
    "My laptop won't start",
    "Forgot my password",
    "Application keeps crashing",
    "VPN not connecting"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg = {
      id: Date.now(),
      type: 'user',
      text: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await authFetch(`${API_BASE}/ai/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText })
      });

      const data = await res.json();

      const botMsg = {
        id: Date.now() + 1,
        type: 'bot',
        text: data.response || 'I encountered an issue. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: data.confidence,
        type_label: data.type,
        category: data.category
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          text: 'Sorry, I encountered a connection issue. Please try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: null
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      type: 'bot',
      text: `Hello again! How can I help you today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: null
    }]);
  };

  const renderText = (text) => {
    // Simple markdown-like rendering
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Bold
      const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <p
          key={i}
          style={{
            margin: '2px 0',
            lineHeight: 1.6,
            fontSize: '14px'
          }}
          dangerouslySetInnerHTML={{ __html: boldFormatted }}
        />
      );
    });
  };

  const confidenceColor = (c) => {
    if (!c) return '#6B7280';
    if (c >= 80) return '#10B981';
    if (c >= 50) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.botAvatar}>
            <Bot size={24} color="#fff" />
            <div style={styles.onlineDot} />
          </div>
          <div>
            <h1 style={styles.headerTitle}>AI Support Assistant</h1>
            <p style={styles.headerSubtitle}>
              <span style={styles.onlineIndicator}>● Online</span> — Powered by Smart Support Desk AI
            </p>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.actionBtn} onClick={() => navigate('/knowledge-base')}>
            <BookOpen size={15} /> Knowledge Base
          </button>
          <button style={styles.actionBtn} onClick={() => navigate('/tickets')}>
            <Ticket size={15} /> Create Ticket
          </button>
          <button style={styles.clearBtn} onClick={clearChat}>
            <RefreshCw size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Chat Window */}
      <div style={styles.chatWindow}>
        <div style={styles.messagesArea}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              {msg.type === 'bot' && (
                <div style={styles.botAvatarSmall}>
                  <Sparkles size={14} color="#6366F1" />
                </div>
              )}

              <div
                style={{
                  ...styles.bubble,
                  ...(msg.type === 'user' ? styles.userBubble : styles.botBubble)
                }}
              >
                {renderText(msg.text)}

                <div style={styles.bubbleMeta}>
                  <span style={styles.timeText}>{msg.time}</span>
                  {msg.confidence !== null && msg.confidence !== undefined && (
                    <span style={{ ...styles.confBadge, color: confidenceColor(msg.confidence) }}>
                      {msg.confidence}% confident
                    </span>
                  )}
                </div>
              </div>

              {msg.type === 'user' && (
                <div style={styles.userAvatarSmall}>
                  <User size={14} color="#fff" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
              <div style={styles.botAvatarSmall}>
                <Sparkles size={14} color="#6366F1" />
              </div>
              <div style={{ ...styles.bubble, ...styles.botBubble }}>
                <div style={styles.typingIndicator}>
                  <span style={styles.dot} />
                  <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                  <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        <div style={styles.quickRepliesArea}>
          <p style={styles.quickRepliesLabel}>Quick questions:</p>
          <div style={styles.quickRepliesRow}>
            {quickReplies.map(qr => (
              <button
                key={qr}
                style={styles.quickReplyBtn}
                onClick={() => sendMessage(qr)}
                disabled={isTyping}
              >
                {qr}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          <div style={styles.inputWrapper}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your IT issue..."
              style={styles.input}
              rows={1}
              disabled={isTyping}
            />
            <button
              style={{
                ...styles.sendBtn,
                opacity: (!input.trim() || isTyping) ? 0.5 : 1,
                cursor: (!input.trim() || isTyping) ? 'not-allowed' : 'pointer'
              }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
            >
              <Send size={16} color="#fff" />
            </button>
          </div>
          <p style={styles.inputHint}>Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* Info Cards */}
      <div style={styles.infoCards}>
        <div style={styles.infoCard}>
          <Zap size={18} color="#6366F1" />
          <div>
            <h4 style={styles.infoCardTitle}>Instant Answers</h4>
            <p style={styles.infoCardText}>Get immediate solutions from our knowledge base</p>
          </div>
        </div>
        <div style={styles.infoCard}>
          <BookOpen size={18} color="#10B981" />
          <div>
            <h4 style={styles.infoCardTitle}>Knowledge Base</h4>
            <p style={styles.infoCardText}>Backed by curated IT resolution articles</p>
          </div>
        </div>
        <div style={styles.infoCard}>
          <Ticket size={18} color="#F59E0B" />
          <div>
            <h4 style={styles.infoCardTitle}>Auto-Escalation</h4>
            <p style={styles.infoCardText}>Complex issues escalated to support engineers</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    padding: '28px 32px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '12px'
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  botAvatar: {
    width: '50px', height: '50px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99,102,241,0.35)', position: 'relative'
  },
  onlineDot: {
    position: 'absolute', bottom: '2px', right: '2px',
    width: '12px', height: '12px', borderRadius: '50%',
    background: '#10B981', border: '2px solid #fff'
  },
  headerTitle: { fontSize: '21px', fontWeight: 700, color: '#111827', margin: 0 },
  headerSubtitle: { fontSize: '12px', color: '#6B7280', margin: '3px 0 0' },
  onlineIndicator: { color: '#10B981', fontWeight: 600 },
  headerActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px',
    background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#6366F1'
  },
  clearBtn: {
    display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px',
    background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#6B7280'
  },
  chatWindow: {
    background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column'
  },
  messagesArea: {
    padding: '24px', minHeight: '400px', maxHeight: '500px',
    overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px',
    background: '#FAFAFA'
  },
  messageRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
  botAvatarSmall: {
    width: '30px', height: '30px', borderRadius: '50%',
    background: '#EEF2FF', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0
  },
  userAvatarSmall: {
    width: '30px', height: '30px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  bubble: {
    maxWidth: '70%', padding: '12px 16px', borderRadius: '16px',
    lineHeight: 1.5, wordBreak: 'break-word'
  },
  botBubble: {
    background: '#fff', border: '1px solid #E5E7EB',
    borderRadius: '4px 16px 16px 16px', color: '#374151',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  },
  userBubble: {
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    borderRadius: '16px 4px 16px 16px', color: '#fff'
  },
  bubbleMeta: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginTop: '6px', gap: '10px'
  },
  timeText: { fontSize: '11px', opacity: 0.6 },
  confBadge: { fontSize: '11px', fontWeight: 600 },
  typingIndicator: { display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' },
  dot: {
    width: '7px', height: '7px', borderRadius: '50%', background: '#9CA3AF',
    display: 'inline-block', animation: 'bounce 1.2s infinite ease-in-out'
  },
  quickRepliesArea: {
    padding: '12px 20px', borderTop: '1px solid #F3F4F6', background: '#fff'
  },
  quickRepliesLabel: { fontSize: '11px', color: '#9CA3AF', margin: '0 0 8px', fontWeight: 500 },
  quickRepliesRow: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  quickReplyBtn: {
    padding: '6px 12px', background: '#F5F3FF', border: '1px solid #DDD6FE',
    borderRadius: '20px', cursor: 'pointer', fontSize: '12px', color: '#6366F1',
    fontWeight: 500, transition: 'all 0.15s'
  },
  inputArea: { padding: '16px 20px', borderTop: '1px solid #F3F4F6', background: '#fff' },
  inputWrapper: { display: 'flex', gap: '10px', alignItems: 'flex-end' },
  input: {
    flex: 1, padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: '12px',
    fontSize: '14px', color: '#111827', resize: 'none', outline: 'none',
    fontFamily: 'inherit', lineHeight: 1.5, background: '#F9FAFB',
    maxHeight: '120px', overflowY: 'auto'
  },
  sendBtn: {
    width: '44px', height: '44px', borderRadius: '12px', border: 'none',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
    transition: 'opacity 0.15s'
  },
  inputHint: { fontSize: '11px', color: '#9CA3AF', margin: '6px 0 0' },
  infoCards: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px'
  },
  infoCard: {
    background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px',
    padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  infoCardTitle: { fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 2px' },
  infoCardText: { fontSize: '12px', color: '#9CA3AF', margin: 0 }
};

export default Chatbot;
