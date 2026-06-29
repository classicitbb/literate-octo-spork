const BASE = '/api';

function getToken() { return localStorage.getItem('ps_token'); }
function setToken(t) { localStorage.setItem('ps_token', t); }
function clearToken() { localStorage.removeItem('ps_token'); }

async function refreshToken() {
  const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.token) { setToken(data.token); return data; }
  return null;
}

async function request(method, path, body, retry = true) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    const refreshed = await refreshToken();
    if (refreshed) return request(method, path, body, false);
    clearToken();
    window.location.reload();
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status, data: err });
  }

  return res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
  setToken,
  getToken,
  clearToken,
  logout: async () => {
    try { await request('POST', '/auth/logout', {}); } catch {}
    clearToken();
    window.location.hash = '#/login';
    window.location.reload();
  },
};

export function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function isTokenValid(token) {
  if (!token) return false;
  const payload = parseJwt(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}
