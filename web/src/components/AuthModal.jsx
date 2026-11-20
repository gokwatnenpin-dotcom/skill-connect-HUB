import { useState } from 'react';
import { request } from '../api.js';
import { supabase } from '../supabase.js';


export default function AuthModal({ onClose, onLogin }) {
  const [signup, setSignup] = useState(false);
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [suspended, setSuspended] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSuspended(false);

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
      if (data.verificationRequired) {
        setVerificationEmail(data.email);
        setVerificationSent(true);
      } else {
        localStorage.token = data.token;
        onLogin(data.user);
      }
    } catch (requestError) {
      setError(requestError.message);
      setSuspended(requestError.code === 'ACCOUNT_SUSPENDED');
      if (requestError.code === 'EMAIL_NOT_VERIFIED') setVerificationEmail(String(form.get('email') || '').trim());
    }
  }

  async function resendVerification() {
    try {
      const data = await request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: verificationEmail }) });
      setVerificationSent(true);
      setError(data.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function continueWithGoogle() {
    if (!supabase) { setError('Google sign-in is not configured. Add the Supabase frontend variables.'); return; }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <div className="backdrop">
      <div className="modal">
        <button className="close" onClick={onClose}>×</button>
        <p className="eyebrow">SkillConnectHUB</p>
        <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>

        {verificationSent && <p className="verification-notice">We sent a verification link to <strong>{verificationEmail}</strong>. Open it to verify your email, then log in. The link expires in 24 hours.</p>}

        <form className="form" onSubmit={submit}>
          {signup && <label>Name<input name="name" required minLength="2" maxLength="120" pattern="[A-Za-zÀ-ÖØ-öø-ÿ .'-]+" title="Use 2 to 120 letters, spaces, apostrophes, periods, or hyphens." autoComplete="name" /></label>}
          <label>Email<input name="email" type="email" required maxLength="254" autoComplete="email" /></label>
          <label>Password<span className="password-control"><input name="password" type={showPassword ? 'text' : 'password'} minLength="8" maxLength="128" pattern={signup ? '(?=.*[A-Za-z])(?=.*[0-9]).{8,128}' : undefined} title="Use 8 to 128 characters with at least one letter and one number." required autoComplete={signup ? 'new-password' : 'current-password'} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
          <label>
            Account type
            <select name="role" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="customer">Customer</option>
              <option value="artisan">Artisan</option>
            </select>
          </label>
          <button className="primary full">{signup ? 'Create account' : 'Log in'}</button>
        </form>

        {<>
          <div className="my-3 text-center text-sm text-slate">or continue with</div>
          <button type="button" className="google-button" onClick={continueWithGoogle}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 12.27c0-.72-.06-1.26-.2-1.82H12v3.45h5.37a4.58 4.58 0 0 1-1.99 3.01v2.5h3.22c1.88-1.73 2.75-4.28 2.75-7.14Z"/><path fill="currentColor" d="M12 21.75c2.7 0 4.97-.9 6.63-2.44l-3.22-2.5c-.9.6-2.04.96-3.41.96-2.62 0-4.84-1.77-5.64-4.15H3.03v2.58A10 10 0 0 0 12 21.75Z"/><path fill="currentColor" d="M6.36 13.62a6 6 0 0 1 0-3.24V7.8H3.03a10 10 0 0 0 0 8.4l3.33-2.58Z"/><path fill="currentColor" d="M12 6.23c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.96 3.23 14.7 2.25 12 2.25a10 10 0 0 0-8.97 5.55l3.33 2.58C7.16 8 9.38 6.23 12 6.23Z"/></svg>
            Continue with Google
          </button>
        </>}

        {suspended && <p className="error"><strong>Account suspended</strong><br />{error}</p>}
        {!suspended && error && <p className="error">{error}</p>}
        {verificationEmail && !verificationSent && <button type="button" className="link full" onClick={resendVerification}>Resend verification email</button>}
        {verificationSent && <button type="button" className="link full" onClick={resendVerification}>Send another verification link</button>}
        <button className="link switch" onClick={() => { setSignup(!signup); setError(''); }}>
          {signup ? 'Already have an account? Log in' : 'Create an account'}
        </button>
      </div>
    </div>
  );
}
