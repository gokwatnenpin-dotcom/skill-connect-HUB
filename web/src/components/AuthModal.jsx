import { useState } from 'react';
import { request } from '../api.js';

export default function AuthModal({ onClose, onLogin }) {
  const [signup, setSignup] = useState(false);
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
          role: form.get('role'),
        }),
      });
      localStorage.token = data.token;
      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.message);
    }
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
              <select name="role" defaultValue="customer">
                <option value="customer">Customer</option>
                <option value="artisan">Artisan</option>
              </select>
            </label>
          )}
          <button className="primary full">{signup ? 'Create account' : 'Log in'}</button>
        </form>

        {error && <p className="error">{error}</p>}
        <button className="link switch" onClick={() => { setSignup(!signup); setError(''); }}>
          {signup ? 'Already have an account? Log in' : 'Create an account'}
        </button>
      </div>
    </div>
  );
}
