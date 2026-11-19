const API = import.meta.env.VITE_API_URL || (window.location.hostname.endsWith('vercel.app') ? 'https://skill-connect-hub.onrender.com/api' : 'http://localhost:5000/api');

export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(localStorage.token ? { Authorization: `Bearer ${localStorage.token}` } : {}),
  };
}

export async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
  const response = await fetch(`${API}${path}`, {
    ...options,
    signal: controller.signal,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  clearTimeout(timeout);
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: 'The server returned an invalid response.' }; }
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong.');
    error.code = data.code;
    error.suspensionReason = data.suspensionReason;
    throw error;
  }
  return data;
}

export async function uploadFile(file, kind) {
  const uploadFileValue = file?.type?.startsWith('image/') ? await compressImage(file) : file;
  const form = new FormData();
  form.append('file', uploadFileValue);
  form.append('kind', kind);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const response = await fetch(`${API}/uploads`, { method: 'POST', signal: controller.signal, headers: localStorage.token ? { Authorization: `Bearer ${localStorage.token}` } : {}, body: form });
  clearTimeout(timeout);
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: 'The server returned an invalid response.' }; }
  if (!response.ok) throw new Error(data.message || 'Photo upload failed.');
  return data;
}

async function compressImage(file) {
  if (file.size < 700 * 1024 || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' }) : file;
  } catch { return file; }
}

export function go(path) {
  window.location.hash = path;
}
