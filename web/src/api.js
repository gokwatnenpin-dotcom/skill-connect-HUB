const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

export function go(path) {
  window.location.hash = path;
}
