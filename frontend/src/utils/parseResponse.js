/**
 * parseResponse.js — Robust HTTP Response Parser
 *
 * Prevents "Unexpected end of JSON input" and "SyntaxError: Unexpected token '<'"
 * by inspecting response status, content-type header, and raw text before parsing.
 */

export async function parseResponse(response, defaultErrorMessage = 'Request failed') {
  const contentType = response.headers.get('content-type') || '';
  const status = response.status;

  let text = '';
  try {
    text = await response.text();
  } catch (readErr) {
    throw new Error(`Failed to read response from server: ${readErr.message}`);
  }

  // Handle empty bodies (204 No Content, 205, or empty 200/405/502)
  if (!text || !text.trim()) {
    if (response.ok) {
      return {};
    }
    if (status === 404 || status === 405) {
      throw new Error(`Backend endpoint unavailable (HTTP ${status}). The API server is not deployed or reachable.`);
    }
    throw new Error(`${defaultErrorMessage} (HTTP ${status})`);
  }

  // Attempt JSON parsing if text is present
  let data = null;
  const looksLikeJson = text.trim().startsWith('{') || text.trim().startsWith('[');

  if (contentType.includes('application/json') || looksLikeJson) {
    try {
      data = JSON.parse(text);
    } catch {
      // Fall through to HTML or generic text handler
    }
  }

  // If response was not OK (HTTP 4xx or 5xx)
  if (!response.ok) {
    if (data && typeof data === 'object') {
      const message = data.message || data.error || data.detail || defaultErrorMessage;
      const err = new Error(message);
      err.status = status;
      err.data = data;
      throw err;
    }

    // If server returned HTML (e.g. 404/502 error page or Vite index.html fallback)
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(`Backend server unavailable or returned HTML instead of JSON (HTTP ${status}). Please ensure the backend is running.`);
    }

    throw new Error(text.slice(0, 150) || `${defaultErrorMessage} (HTTP ${status})`);
  }

  // Response is OK (2xx)
  if (data !== null) {
    return data;
  }

  // Non-JSON successful response
  if (text.includes('<!DOCTYPE') || text.includes('<html')) {
    throw new Error('Received HTML response instead of JSON. The backend API is not connected.');
  }

  return { message: text };
}
