import express from 'express';
import rateLimit from 'express-rate-limit';
import { normalizeEmail, validateSignup } from '../validators/auth.js';

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many login or signup attempts. Try again later.' } });

export default function authRoutes({ pool, hashPassword, validPassword, newToken, publicUser, databaseMessage }) {
  router.post('/signup', authLimiter, async (req, res) => {
    const { name, email, password, role = 'customer' } = req.body;
    const validationError = validateSignup({ name, email, password, role });
    if (validationError) return res.status(400).json({ message: validationError });
    try {
      const { salt, hash } = hashPassword(password);
      const result = await pool.query('INSERT INTO users (name, email, password_hash, password_salt, role) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name.trim(), normalizeEmail(email), hash, salt, role]);
      const session = newToken();
      await pool.query("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')", [result.rows[0].id, session]);
      res.status(201).json({ token: session, user: publicUser(result.rows[0]) });
    } catch (error) {
      res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'That email is already registered.' : databaseMessage(error) });
    }
  });

  router.post('/login', authLimiter, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = LOWER($1)', [req.body.email || '']);
      const user = result.rows[0];
      if (!user || !validPassword(req.body.password || '', user.password_salt, user.password_hash)) return res.status(401).json({ message: 'Email or password is incorrect.' });
      if (user.suspended) return res.status(403).json({ message: `This account is suspended${user.suspension_reason ? `: ${user.suspension_reason}` : '.'}` });
      const session = newToken();
      await pool.query("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')", [user.id, session]);
      res.json({ token: session, user: publicUser(user) });
    } catch (error) {
      res.status(500).json({ message: databaseMessage(error) });
    }
  });
  return router;
}
