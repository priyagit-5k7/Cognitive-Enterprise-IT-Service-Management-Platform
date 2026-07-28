import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, AlertTriangle, Info, CheckCircle, Zap } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const typeIcon = (type) => {
  switch (type) {
    case 'success': return <CheckCircle size={14} className="text-emerald-400" />;
    case 'error': return <AlertTriangle size={14} className="text-red-400" />;
    case 'warning': return <AlertTriangle size={14} className="text-amber-400" />;
    case 'ai': return <Zap size={14} className="text-violet-400" />;
    default: return <Info size={14} className="text-blue-400" />;
  }
};

const priorityDot = (priority) => {
  const colors = { critical: 'bg-red-500', high: 'bg-amber-500', normal: 'bg-blue-500' };
  return colors[priority] || 'bg-blue-500';
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = (notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const recent = notifications.slice(0, 8);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-xl hover:bg-white/5 transition-all group"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-slate-300 group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-96 bg-[#1A1A2E] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-indigo-400" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-indigo-500/20 text-indigo-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                  title="Mark all as read"
                >
                  <CheckCheck size={15} />
                </button>
              )}
              <button
                onClick={() => { navigate('/notifications'); setOpen(false); }}
                className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
              >
                See all
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                  <Bell size={22} className="text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm font-medium">All caught up!</p>
                <p className="text-slate-600 text-xs mt-1">No notifications yet.</p>
              </div>
            ) : (
              recent.map((n) => (
                <div
                  key={n.id}
                  className={`group relative flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${!n.is_read ? 'bg-indigo-500/5' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  {/* Unread dot */}
                  {!n.is_read && (
                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${priorityDot(n.priority)}`} />
                  )}

                  {/* Icon */}
                  <div className="mt-0.5 w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    {typeIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${n.is_read ? 'text-slate-400' : 'text-white'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
