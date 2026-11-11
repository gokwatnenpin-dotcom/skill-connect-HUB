import { useEffect, useRef, useState } from 'react';
import { request } from '../api.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '324812702978-ul21fnj3ccs5spdu85al4kpcogf49bla.apps.googleusercontent.com';

export default function AuthModal({ onClose, onLogin }) {
  const [signup, setSignup] = useState(false);
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const googleButton = useRef(null);

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

  useEffect(() => {
    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId || !googleButton.current) return undefined;
    const render = () => {
      if (!window.google || !googleButton.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            const data = await request('/auth/google', { method: 'POST', body: JSON.stringify({ credential, role }) });
            localStorage.token = data.token;
            onLogin(data.user);
          } catch (requestError) { setError(requestError.message); }
        },
      });
      googleButton.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButton.current, { theme: 'outline', size: 'large', width: 360, text: 'continue_with' });
    };
    if (window.google) render();
    else window.addEventListener('google-loaded', render, { once: true });
    return () => window.removeEventListener('google-loaded', render);
  }, [onLogin, role]);

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

        {GOOGLE_CLIENT_ID && <>
          <div className="my-3 text-center text-sm text-slate">or continue with</div>
          <div ref={googleButton} className="flex justify-center" />
        </>}

        {error && <p className="error">{error}</p>}
        <button className="link switch" onClick={() => { setSignup(!signup); setError(''); }}>
          {signup ? 'Already have an account? Log in' : 'Create an account'}
        </button>
      </div>
    </div>
  );
}
