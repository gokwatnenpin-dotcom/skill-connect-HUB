import { useState } from 'react';
import { request } from '../api.js';
import { supabase } from '../supabase.js';


export default function AuthModal({ onClose, onLogin }) {
  const [signup, setSignup] = useState(false);
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const data = await request(`/auth/${signup ? 'signup' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
          role,
        }),
      });
      localStorage.token = data.token;
      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function continueWithGoogle() {
    if (!supabase) { setError('Google sign-in is not configured. Add the Supabase frontend variables.'); return; }
    localStorage.googleRole = role;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <div className="backdrop">
      <div className="modal">
        <button className="close" onClick={onClose}>×</button>
        <p className="eyebrow">SkillConnectHUB</p>
        <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>

        <form className="form" onSubmit={submit}>
          {signup && <label>Name<input name="name" required /></label>}
          <label>Email<input name="email" type="email" required /></label>
          <label>Password<input name="password" type="password" minLength="6" required /></label>
          {signup && (
            <label>
              Account type
              <select name="role" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="customer">Customer</option>
                <option value="artisan">Artisan</option>
              </select>
            </label>
          )}
          <button className="primary full">{signup ? 'Create account' : 'Log in'}</button>
        </form>

        {<>
          <div className="my-3 text-center text-sm text-slate">or continue with</div>
          <button type="button" className="google-button" onClick={continueWithGoogle}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 12.27c0-.72-.06-1.26-.2-1.82H12v3.45h5.37a4.58 4.58 0 0 1-1.99 3.01v2.5h3.22c1.88-1.73 2.75-4.28 2.75-7.14Z"/><path fill="currentColor" d="M12 21.75c2.7 0 4.97-.9 6.63-2.44l-3.22-2.5c-.9.6-2.04.96-3.41.96-2.62 0-4.84-1.77-5.64-4.15H3.03v2.58A10 10 0 0 0 12 21.75Z"/><path fill="currentColor" d="M6.36 13.62a6 6 0 0 1 0-3.24V7.8H3.03a10 10 0 0 0 0 8.4l3.33-2.58Z"/><path fill="currentColor" d="M12 6.23c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.96 3.23 14.7 2.25 12 2.25a10 10 0 0 0-8.97 5.55l3.33 2.58C7.16 8 9.38 6.23 12 6.23Z"/></svg>
            Continue with Google
          </button>
        </>}

        {error && <p className="error">{error}</p>}
        <button className="link switch" onClick={() => { setSignup(!signup); setError(''); }}>
          {signup ? 'Already have an account? Log in' : 'Create an account'}
        </button>
      </div>
    </div>
  );
}
