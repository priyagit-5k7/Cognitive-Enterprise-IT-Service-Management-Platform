const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api/v1';

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const err = new Error('API Request Failed');
    try {
      const data = await response.json();
      err.response = { data };
    } catch {
      err.response = { data: { message: response.statusText } };
    }
    throw err;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return { data: {} };
  }

  const data = await response.json();
  return { data };
};

const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;
