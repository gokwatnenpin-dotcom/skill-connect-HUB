import { useState } from 'react';
import { request } from '../api.js';

export default function GoogleSetup({ identity, accessToken, onComplete }) {
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await request('/auth/supabase', { method: 'POST', body: JSON.stringify({ accessToken, role }) }); localStorage.token = result.token; onComplete(result.user); } catch (requestError) { setError(requestError.message); setBusy(false); }
  }
  return <div className="backdrop"><div className="modal"><p className="eyebrow">One quick setup step</p><h2>How will you use SkillConnect-HUB?</h2><p className="muted">You are signing in as <strong>{identity?.email}</strong>. Choose the account type that matches you.</p><form className="form" onSubmit={submit}><label>Account type<select value={role} onChange={(event) => setRole(event.target.value)}><option value="customer">Customer — find and hire artisans</option><option value="artisan">Artisan — offer services and products</option></select></label><button className="primary full" disabled={busy}>{busy ? 'Setting up…' : 'Continue'}</button></form>{error && <p className="error">{error}</p>}</div></div>;
}
