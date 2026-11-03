export const API_BASE_URL = (window.__APP_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || '/backend/api/').replace(/\/?$/, '/');
export const AUTH_BASE_URL = API_BASE_URL.replace(/api\/$/, 'auth/');

export const getAuthToken = () => localStorage.getItem('auth_token');

export const authHeaders = (extra = {}) => {
  const token = getAuthToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Token ${token}` } : {}),
  };
};

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.replace(/^\//, '')}`;
  const response = await fetch(url, {
    ...options,
    headers: authHeaders({
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.detail || data?.error || JSON.stringify(data);
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return data;
}

export function hasUsablePhone(phone) {
  if (!phone) return false;
  const normalized = String(phone).trim().toLowerCase();
  return normalized !== '' && normalized !== 'not provided' && normalized !== 'n/a' && normalized !== 'none';
}

export function cleanPhoneForBackend(phone) {
  const trimmed = String(phone || '').trim();
  return trimmed ? trimmed.slice(0, 15) : 'Not Provided';
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
