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
          <button type="button" className="w-full rounded-lg border border-stone bg-white px-4 py-3 font-bold text-charcoal hover:border-green" onClick={continueWithGoogle}>Continue with Google</button>
        </>}

        {error && <p className="error">{error}</p>}
        <button className="link switch" onClick={() => { setSignup(!signup); setError(''); }}>
          {signup ? 'Already have an account? Log in' : 'Create an account'}
        </button>
      </div>
    </div>
  );
}
