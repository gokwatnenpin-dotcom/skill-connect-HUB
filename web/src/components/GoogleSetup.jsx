import { useState } from 'react';
import { request } from '../api.js';

export default function GoogleSetup({ identity, accessToken, onComplete }) {
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await request('/auth/supabase', { method: 'POST', body: JSON.stringify({ accessToken, role, acceptedTerms }) }); localStorage.token = result.token; localStorage.user = JSON.stringify(result.user); onComplete(result.user); } catch (requestError) { setError(requestError.message); setBusy(false); }
  }
  return <div className="backdrop"><div className="modal"><p className="eyebrow">One quick setup step</p><h2>How will you use SkillConnect-HUB?</h2><p className="muted">You are signing in as <strong>{identity?.email}</strong>. Choose the account type that matches you.</p><form className="form" onSubmit={submit}><label>Account type<select value={role} onChange={(event) => setRole(event.target.value)}><option value="customer">Customer — find and hire artisans</option><option value="artisan">Artisan — offer services and products</option></select></label><label className="terms-accept"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} required /> <span>I have read and agree to the <a href="#terms" target="_blank" rel="noreferrer">Terms and Conditions</a>.</span></label><button className="primary full" disabled={busy}>{busy ? 'Setting up…' : 'Continue'}</button></form>{error && <p className="error">{error}</p>}</div></div>;
}
