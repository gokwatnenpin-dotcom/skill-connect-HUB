const API = import.meta.env.VITE_API_URL || (window.location.hostname.endsWith('vercel.app') ? 'https://skill-connect-hub.onrender.com/api' : 'http://localhost:5000/api');

export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(localStorage.token ? { Authorization: `Bearer ${localStorage.token}` } : {}),
  };
}

export async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong.');
    error.code = data.code;
    error.suspensionReason = data.suspensionReason;
    throw error;
  }
  return data;
}

export async function uploadFile(file, kind) {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  const response = await fetch(`${API}/uploads`, { method: 'POST', headers: localStorage.token ? { Authorization: `Bearer ${localStorage.token}` } : {}, body: form });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.message || 'Photo upload failed.');
  return data;
}

export function go(path) {
  window.location.hash = path;
}
