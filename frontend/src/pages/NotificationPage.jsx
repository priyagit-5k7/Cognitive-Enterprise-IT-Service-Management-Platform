import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle, Zap, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const typeIcon = (type) => {
  switch (type) {
    case 'success': return <CheckCircle size={18} style={{ color: 'var(--status-success)' }} />;
    case 'error': return <AlertTriangle size={18} style={{ color: 'var(--status-error)' }} />;
    case 'warning': return <AlertTriangle size={18} style={{ color: 'var(--status-warning)' }} />;
    case 'ai': return <Zap size={18} style={{ color: 'var(--color-primary)' }} />;
    default: return <Info size={18} style={{ color: 'var(--status-info)' }} />;
  }
};

const getPriorityBadgeStyle = (priority) => {
  switch (priority) {
    case 'critical':
      return { backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', border: '1px solid var(--status-error)' };
    case 'high':
      return { backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)', border: '1px solid var(--status-warning)' };
    default:
      return { backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)', border: '1px solid var(--status-info)' };
  }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

export default function NotificationPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll, fetchNotifications } = useNotifications();
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const handleRefresh = async () => {
    setLoading(true);
    await fetchNotifications();
    setTimeout(() => setLoading(false), 400);
  };

  const handleClick = (n) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--status-info-bg)',
              color: 'var(--status-info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={22} />
            </div>
            <span>Notifications Center</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            {unreadCount > 0 
              ? `You have ${unreadCount} unread system alert${unreadCount > 1 ? 's' : ''}`
              : 'All caught up — no unread notifications'}
          </p>
        </div>

        {/* Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '9px 12px' }}
            title="Refresh alerts"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn btn-primary"
              style={{ width: 'auto', padding: '9px 14px' }}
            >
              <CheckCheck size={16} />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '9px 12px', color: 'var(--status-error)' }}
              title="Delete all notifications"
            >
              <Trash2 size={16} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px',
        backgroundColor: 'var(--bg-surface)',
        padding: '6px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        width: 'fit-content'
      }}>
        {[
          { key: 'all', label: `All (${notifications.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'read', label: `Read (${notifications.length - unreadCount})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`btn ${filter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              background: filter === tab.key ? 'var(--color-primary)' : 'transparent',
              color: filter === tab.key ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Bell size={44} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
            <h4 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>No notifications found</h4>
            <p style={{ fontSize: '14px' }}>
              {filter !== 'all' ? `No ${filter} alerts matching this filter.` : 'You have no notifications at this time.'}
            </p>
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className="panel"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '16px 20px',
                marginBottom: 0,
                cursor: 'pointer',
                backgroundColor: !n.is_read ? 'var(--bg-surface)' : 'var(--bg-app)',
                borderColor: !n.is_read ? 'var(--color-primary)' : 'var(--border-color)',
                borderLeftWidth: !n.is_read ? '4px' : '1px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              {/* Type Icon */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {typeIcon(n.type)}
              </div>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: n.is_read ? 600 : 700, color: 'var(--text-main)' }}>
                    {n.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {n.priority && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        ...getPriorityBadgeStyle(n.priority)
                      }}>
                        {n.priority}
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatTime(n.created_at)}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  {n.message}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {!n.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                    className="btn btn-secondary"
                    style={{ padding: '6px 8px', fontSize: '12px', width: 'auto' }}
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                  className="btn btn-secondary"
                  style={{ padding: '6px 8px', fontSize: '12px', width: 'auto', color: 'var(--status-error)' }}
                  title="Delete notification"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
