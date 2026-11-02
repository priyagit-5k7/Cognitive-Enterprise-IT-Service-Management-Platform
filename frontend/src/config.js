/**
 * config.js — Centralized environment and API configuration
 *
 * Checks VITE_API_URL, VITE_API_BASE_URL, and VITE_API_BASE in priority order.
 * Normalizes the base URL by stripping trailing slashes and ensuring '/api/v1' suffix.
 * Prevents unintended localhost calls in production builds.
 */

const rawApiUrl = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://localhost:5000/api/v1' : '')
).trim().replace(/\/+$/, '');

// Ensure /api/v1 prefix is appended exactly once
export const API_BASE = rawApiUrl.endsWith('/api/v1')
  ? rawApiUrl
  : rawApiUrl
    ? `${rawApiUrl}/api/v1`
    : '/api/v1';

// Base backend origin without /api/v1 (useful for socket.io connections)
export const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1$/, '');

export const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  BACKEND_ORIGIN ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '')
).trim().replace(/\/+$/, '');
