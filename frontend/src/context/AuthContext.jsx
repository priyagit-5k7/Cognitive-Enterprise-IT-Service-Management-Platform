import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext();

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api/v1';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Logout function
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  // Refresh access token
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      setToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken;
    } catch (err) {
      console.error('Session expired, logging out...', err);
      logout();
      return null;
    }
  }, [logout]);

  // Authenticated fetch wrapper that handles token refresh automatically
  const authFetch = useCallback(async (url, options = {}) => {
    let currentToken = token;
    
    // Add auth header helper
    const addAuthHeader = (opts, tok) => {
      const headers = opts.headers ? { ...opts.headers } : {};
      if (tok) {
        headers['Authorization'] = `Bearer ${tok}`;
      }
      return { ...opts, headers };
    };

    // If no token exists and we have a refresh token, try to refresh first
    if (!currentToken && localStorage.getItem('refreshToken')) {
      currentToken = await refreshAccessToken();
    }

    let response = await fetch(url, addAuthHeader(options, currentToken));

    // Handle token expired (401 with code or general 401)
    if (response.status === 401) {
      // Try to refresh token
      currentToken = await refreshAccessToken();
      if (currentToken) {
        // Retry the original request with new token
        response = await fetch(url, addAuthHeader(options, currentToken));
      }
    }

    return response;
  }, [token, refreshAccessToken]);

  // Auto-login on mount if refresh token exists
  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const accessToken = await refreshAccessToken();
        if (accessToken) {
          try {
            const profileRes = await fetch(`${API_BASE}/auth/me`, {
              headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              setUser(profileData.user);
            }
          } catch (err) {
            console.error('Failed to load user profile on init:', err);
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [refreshAccessToken]);

  // Login handler
  const login = async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    setToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  // Register handler
  const register = async (name, email, password) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    return data;
  };

  const hasPermission = useCallback((permission) => {
    if (!user || !user.permissions) return false;
    if (user.role_name === 'Admin') return true;
    if (user.permissions.includes(permission)) return true;
    
    const [resource] = permission.split(':');
    if (resource && user.permissions.includes(`${resource}:*`)) return true;
    
    return user.permissions.includes('*');
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      authFetch,
      hasPermission,
      API_BASE,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
