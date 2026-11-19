import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { normalizeEmail, validateEmail, validateSignup } from '../validators/auth.js';
import { getSupabaseUser } from '../services/supabase.js';
import { sendVerificationEmail } from '../services/email.js';

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many login or signup attempts. Try again later.' } });

export default function authRoutes({ pool, hashPassword, validPassword, newToken, publicUser, databaseMessage, mailer }) {
  const sendPhoneCode = async (phone, code) => {
    if (process.env.PHONE_VERIFICATION_MODE === 'development') { console.log(`[PHONE TEST MODE] verification code for ${phone}: ${code}`); return; }
    if (process.env.PHONE_VERIFICATION_MODE !== 'production') return;
    if (!process.env.TERMII_API_KEY) throw new Error('Phone verification is not configured.');
    const response = await fetch(`${process.env.TERMII_BASE_URL || 'https://api.ng.termii.com'}/api/sms/send`, { method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: process.env.TERMII_API_KEY, to: phone, from: process.env.TERMII_SENDER_ID || 'SkillConnect', sms: `Your SkillConnect-HUB verification code is ${code}. It expires soon.`, type: 'plain', channel: 'generic' }) });
    if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  };
  const createPhoneCode = async (user, phone) => { const code = String(crypto.randomInt(100000, 1000000)); const hash = crypto.createHash('sha256').update(code).digest('hex'); await pool.query('DELETE FROM phone_verification_codes WHERE user_id = $1 AND consumed_at IS NULL', [user.id]); await pool.query("INSERT INTO phone_verification_codes (user_id, phone, code_hash, expires_at) VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 minute'))", [user.id, phone, hash, Number(process.env.PHONE_VERIFICATION_CODE_TTL_MINUTES || 10)]); await sendPhoneCode(phone, code); };
  const makeVerification = async (user) => {
    const token = newToken();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);
    await pool.query("INSERT INTO email_verification_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')", [tokenHash, user.id]);
    const apiBase = (process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000').replace(/\/$/, '');
    const url = `${apiBase}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail(mailer, { to: user.email, name: user.name, url });
  };

  router.post('/signup', authLimiter, async (req, res) => {
    const { name, email, password, role = 'customer', phone } = req.body;
    const validationError = validateSignup({ name, email, password, role });
    if (validationError) return res.status(400).json({ message: validationError });
    if (!mailer) return res.status(503).json({ message: 'Email verification is not configured. Add BREVO_API_KEY and BREVO_SENDER_EMAIL to the backend environment.' });
    try {
      const { salt, hash } = hashPassword(password);
      const normalizedPhone = String(phone || '').replace(/[\s()-]/g, '');
      if (process.env.PHONE_VERIFICATION_MODE !== 'disabled' && !/^\+?\d{10,15}$/.test(normalizedPhone)) return res.status(400).json({ message: 'Enter a valid phone number for verification.' });
      const result = await pool.query('INSERT INTO users (name, email, password_hash, password_salt, role, phone, email_verified, phone_verified) VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7) RETURNING *', [name.trim(), normalizeEmail(email), hash, salt, role, normalizedPhone || null, process.env.PHONE_VERIFICATION_MODE === 'disabled']);
      if (process.env.PHONE_VERIFICATION_MODE !== 'disabled') { try { await createPhoneCode(result.rows[0], normalizedPhone); } catch (error) { console.error(`Verification SMS failed for user ${result.rows[0].id}: ${error.message}`); return res.status(502).json({ message: 'Your account was created, but the verification SMS could not be sent.' }); } }
      try {
        await makeVerification(result.rows[0]);
      } catch (error) {
        console.error(`Verification email delivery failed for user ${result.rows[0].id}: ${error.message}`);
        return res.status(502).json({ message: 'Your account was created, but the verification email could not be sent. Check the email address or request another verification email.' });
      }
      res.status(201).json({ verificationRequired: true, phoneVerificationRequired: process.env.PHONE_VERIFICATION_MODE !== 'disabled', email: result.rows[0].email, message: 'Check your email for a verification link. It expires in 24 hours.' });
    } catch (error) {
      res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'That email is already registered.' : databaseMessage(error) });
    }
  });

  router.post('/verify-phone', authLimiter, async (req, res) => { const email = normalizeEmail(req.body.email || ''); const code = String(req.body.code || ''); if (!validateEmail(email) || !/^\d{6}$/.test(code)) { try { const user = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0]; if (!user) return res.status(400).json({ message: 'Invalid verification details.' }); const record = (await pool.query("SELECT * FROM phone_verification_codes WHERE user_id = $1 AND consumed_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1", [user.id])).rows[0]; if (!record || record.attempts >= 5) return res.status(400).json({ message: 'That verification code is invalid or expired.' }); const valid = crypto.timingSafeEqual(Buffer.from(record.code_hash, 'hex'), Buffer.from(crypto.createHash('sha256').update(code).digest('hex'), 'hex')); if (!valid) { await pool.query('UPDATE phone_verification_codes SET attempts = attempts + 1 WHERE id = $1', [record.id]); return res.status(400).json({ message: 'That verification code is invalid or expired.' }); } await pool.query('UPDATE phone_verification_codes SET consumed_at = NOW() WHERE id = $1', [record.id]); await pool.query('UPDATE users SET phone_verified = TRUE WHERE id = $1', [user.id]); return res.json({ message: 'Phone verified. You can now sign in.' }); } catch (error) { return res.status(500).json({ message: databaseMessage(error) }); } } return res.status(400).json({ message: 'Invalid verification details.' }); });

  router.post('/resend-verification', authLimiter, async (req, res) => {
    const email = normalizeEmail(req.body.email || '');
    const validationError = validateEmail(email);
    if (validationError) return res.status(400).json({ message: validationError });
    try {
      const user = (await pool.query('SELECT id, name, email, email_verified FROM users WHERE email = $1 AND role IN (\'customer\', \'artisan\')', [email])).rows[0];
      if (user && !user.email_verified && mailer) {
        try { await makeVerification(user); }
        catch (error) { console.error(`Verification email resend failed for user ${user.id}: ${error.message}`); }
      }
      res.json({ message: 'If that account needs verification, a new email has been sent.' });
    } catch (error) {
      res.status(500).json({ message: databaseMessage(error) });
    }
  });

  router.get('/verify-email', async (req, res) => {
    const token = String(req.query.token || '');
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).send(verificationResultPage(false));
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const result = await pool.query('UPDATE users SET email_verified = TRUE FROM email_verification_tokens t WHERE users.id = t.user_id AND t.token_hash = $1 AND t.expires_at > NOW() RETURNING users.id', [tokenHash]);
      if (!result.rows[0]) return res.status(400).send(verificationResultPage(false));
      await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [result.rows[0].id]);
      res.send(verificationResultPage(true));
    } catch (error) {
      res.status(500).send(verificationResultPage(false));
    }
  });

  router.post('/login', authLimiter, async (req, res) => {
    const emailError = validateEmail(req.body.email);
    if (emailError || !req.body.password) return res.status(400).json({ message: emailError || 'Enter your password.' });
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = LOWER($1)', [req.body.email || '']);
      const user = result.rows[0];
      if (!user || !validPassword(req.body.password || '', user.password_salt, user.password_hash)) return res.status(401).json({ message: 'Email or password is incorrect.' });
      if (!user.email_verified) return res.status(403).json({ message: 'Verify your email before logging in. Check your inbox or request a new verification link.', code: 'EMAIL_NOT_VERIFIED' });
      if (process.env.PHONE_VERIFICATION_MODE !== 'disabled' && !user.phone_verified) return res.status(403).json({ message: 'Verify your phone before logging in.', code: 'PHONE_NOT_VERIFIED' });
      if (user.suspended) return suspendedResponse(res, user);
      const session = newToken();
      await pool.query("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')", [user.id, session]);
      res.json({ token: session, user: publicUser(user) });
    } catch (error) {
      res.status(500).json({ message: databaseMessage(error) });
    }
  });

  router.post('/supabase', authLimiter, async (req, res) => {
    try {
      const { accessToken, role } = req.body;
      if (!accessToken || (role !== undefined && !['customer', 'artisan'].includes(role))) return res.status(400).json({ message: 'Supabase session is required.' });
      const identity = await getSupabaseUser(accessToken);
      if (!identity?.id || !identity.email) return res.status(401).json({ message: 'Supabase sign-in could not be verified.' });
      let result = await pool.query('SELECT * FROM users WHERE google_sub = $1 OR email = LOWER($2) LIMIT 1', [identity.id, identity.email]);
      let user = result.rows[0];
      if (!user && !role) return res.json({ setupRequired: true, identity: { email: identity.email, name: identity.user_metadata?.full_name || identity.email.split('@')[0] } });
      if (!user) {
        const { salt, hash } = hashPassword(newToken());
        user = (await pool.query('INSERT INTO users (name, email, password_hash, password_salt, role, google_sub, email_verified, phone_verified) VALUES ($1, LOWER($2), $3, $4, $5, $6, TRUE, TRUE) RETURNING *', [identity.user_metadata?.full_name || identity.email.split('@')[0], identity.email, hash, salt, role, identity.id])).rows[0];
      } else if (!user.google_sub) {
        user = (await pool.query('UPDATE users SET google_sub = $1, email_verified = TRUE WHERE id = $2 RETURNING *', [identity.id, user.id])).rows[0];
      }
      if (user.suspended) return suspendedResponse(res, user);
      const session = newToken();
      await pool.query("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')", [user.id, session]);
      res.json({ token: session, user: publicUser(user) });
    } catch {
      res.status(401).json({ message: 'Google sign-in could not be verified.' });
    }
  });
  return router;
}

function suspendedResponse(res, user) {
  const reason = user.suspension_reason ? ` Reason: ${user.suspension_reason}` : '';
  return res.status(403).json({
    code: 'ACCOUNT_SUSPENDED',
    message: `This account is suspended.${reason} Contact support if you believe this is a mistake.`,
    suspensionReason: user.suspension_reason || null,
  });
}

function verificationResultPage(success) {
  const heading = success ? 'Email verified' : 'Verification link invalid or expired';
  const message = success ? 'Your email is verified. You can now sign in to SkillConnect-HUB.' : 'This verification link is invalid or has expired. Request a fresh link from the sign-in page.';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading} · SkillConnect-HUB</title><body style="margin:0;background:#F7F4EE;color:#1E2421;font:16px Inter,Arial,sans-serif"><main style="max-width:520px;margin:12vh auto;padding:32px;background:white;border:1px solid #E4DFD3;border-radius:12px"><h1 style="color:#1F5C46">${heading}</h1><p>${message}</p><a style="display:inline-block;margin-top:12px;padding:12px 18px;border-radius:8px;background:#1F5C46;color:white;text-decoration:none" href="${process.env.CLIENT_URL || 'http://localhost:5173'}">Return to SkillConnect-HUB</a></main></body></html>`;
}
