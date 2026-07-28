import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const toastIdRef = useRef(0);

  // ─── Fetch notifications from API ───
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('[NotificationContext] Fetch error:', err);
    }
  }, [token]);

  // ─── Socket connection ───
  useEffect(() => {
    if (!user || !token) return;

    const sock = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });

    sock.on('connect', () => {
      console.log('[Socket] Connected:', sock.id);
      setConnected(true);
    });

    sock.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
    });

    sock.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      addToast(notification);
    });

    socketRef.current = sock;
    fetchNotifications();

    return () => {
      sock.disconnect();
      socketRef.current = null;
    };
  }, [user, token, fetchNotifications]);

  // ─── Toast management ───
  const addToast = useCallback((notification) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { ...notification, toastId: id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  // ─── API Actions ───
  const markAsRead = useCallback(async (id) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationContext] markAsRead error:', err);
    }
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] markAllAsRead error:', err);
    }
  }, [token]);

  const deleteNotification = useCallback(async (id) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Recalculate unread
      setNotifications(prev => {
        const wasUnread = prev.find(n => n.id === id && !n.is_read);
        if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n.id !== id);
      });
    } catch (err) {
      console.error('[NotificationContext] delete error:', err);
    }
  }, [token]);

  const clearAll = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/clear-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] clearAll error:', err);
    }
  }, [token]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      toasts,
      connected,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
      dismissToast
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;
