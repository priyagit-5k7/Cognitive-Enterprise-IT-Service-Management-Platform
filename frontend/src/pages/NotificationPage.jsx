import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle, Zap, Filter, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const typeIcon = (type) => {
  const icons = {
    success: <CheckCircle size={16} className="text-emerald-400" />,
    error: <AlertTriangle size={16} className="text-red-400" />,
    warning: <AlertTriangle size={16} className="text-amber-400" />,
    ai: <Zap size={16} className="text-violet-400" />,
    info: <Info size={16} className="text-blue-400" />
  };
  return icons[type] || icons.info;
};

const PRIORITY_BADGE = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString();
};

export default function NotificationPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll, fetchNotifications } = useNotifications();
  const [filter, setFilter] = useState('all'); // all | unread | read
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
    setTimeout(() => setLoading(false), 500);
  };

  const handleClick = (n) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <Bell size={20} className="text-indigo-400" />
            </div>
            Notifications
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all ${loading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            >
              <Trash2 size={15} />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 mb-4 w-fit">
        {['all', 'unread', 'read'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f
                ? 'bg-indigo-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-2 bg-white/20 text-white text-xs px-1.5 rounded-full">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/5">
            <Bell size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No notifications</p>
            <p className="text-slate-600 text-sm mt-1">
              {filter !== 'all' ? `No ${filter} notifications.` : "You're all caught up!"}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`group relative flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:border-white/20 ${
                !n.is_read
                  ? 'bg-indigo-500/5 border-indigo-500/20'
                  : 'bg-white/[0.02] border-white/5'
              }`}
              onClick={() => handleClick(n)}
            >
              {/* Unread indicator */}
              {!n.is_read && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
              )}

              {/* Icon */}
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                {typeIcon(n.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.is_read ? 'text-slate-400' : 'text-white'}`}>
                    {n.title}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {n.priority && n.priority !== 'normal' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${PRIORITY_BADGE[n.priority] || ''}`}>
                        {n.priority}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">{n.message}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                {!n.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                    className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 transition-all"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                  title="Delete"
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
