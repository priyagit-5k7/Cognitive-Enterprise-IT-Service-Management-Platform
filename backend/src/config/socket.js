/**
 * socket.js — Enterprise Socket.IO with JWT authentication (Phase 7)
 * 
 * Features:
 * - JWT-authenticated socket connections
 * - Per-user rooms (user_<userId>)
 * - Role-based rooms (role_Admin, role_Manager, etc.)
 * - Helper methods: notifyUser, notifyRole, notifyAll
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // JWT Authentication middleware for sockets
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        // Allow unauthenticated connections but don't assign rooms
        socket.userId = null;
        socket.userRole = null;
        return next();
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        console.warn(`[Socket.IO] Auth failed for socket ${socket.id}: ${err.message}`);
        // Still allow connection but unauthenticated
        socket.userId = null;
        socket.userRole = null;
        next();
      }
    });

    io.on('connection', (socket) => {
      console.log(`[Socket.IO] Connected: ${socket.id} | User: ${socket.userId || 'unauthenticated'}`);

      // Auto-join user room if authenticated via JWT
      if (socket.userId) {
        socket.join(`user_${socket.userId}`);
        console.log(`[Socket.IO] ${socket.id} auto-joined room: user_${socket.userId}`);
      }

      // Auto-join role room
      if (socket.userRole) {
        socket.join(`role_${socket.userRole}`);
        console.log(`[Socket.IO] ${socket.id} auto-joined room: role_${socket.userRole}`);
      }

      // Legacy: allow manual room join (client-side fallback)
      socket.on('join_user_room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`[Socket.IO] ${socket.id} manually joined room: user_${userId}`);
      });

      socket.on('disconnect', (reason) => {
        console.log(`[Socket.IO] Disconnected: ${socket.id} | Reason: ${reason}`);
      });

      socket.on('error', (err) => {
        console.error(`[Socket.IO] Socket error (${socket.id}):`, err.message);
      });
    });

    console.log('[Socket.IO] Initialized with JWT authentication');
    return io;
  },

  getIO: () => {
    if (!io) throw new Error('Socket.IO not initialized');
    return io;
  },

  /** Send event to a specific user */
  notifyUser: (userId, eventName, data) => {
    if (!io || !userId) return;
    io.to(`user_${userId}`).emit(eventName, data);
  },

  /** Send event to all users with a specific role */
  notifyRole: (roleName, eventName, data) => {
    if (!io || !roleName) return;
    io.to(`role_${roleName}`).emit(eventName, data);
  },

  /** Send event to a list of userIds */
  notifyUsers: (userIds, eventName, data) => {
    if (!io || !userIds?.length) return;
    userIds.forEach(uid => io.to(`user_${uid}`).emit(eventName, data));
  },

  /** Broadcast to all connected clients */
  notifyAll: (eventName, data) => {
    if (!io) return;
    io.emit(eventName, data);
  }
};
