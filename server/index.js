import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { pool } from '../src/db.js';


const app = express();
const port = process.env.PORT || 5000;
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') });
const validPassword = (password, salt, hash) => crypto.timingSafeEqual(Buffer.from(hashPassword(password, salt).hash, 'hex'), Buffer.from(hash, 'hex'));
const newToken = () => crypto.randomBytes(32).toString('hex');
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

async function auth(req, res, next) {
  const value = req.headers.authorization || '';
  if (!value.startsWith('Bearer ')) return res.status(401).json({ message: 'Please log in.' });
  const result = await pool.query('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires_at > NOW()', [value.slice(7)]);
  if (!result.rows[0]) return res.status(401).json({ message: 'Your session has expired.' });
  req.user = result.rows[0]; next();
}
const artisanRequired = (req, res, next) => req.user.role === 'artisan' ? next() : res.status(403).json({ message: 'Only artisan accounts can do this.' });
const databaseMessage = (error) => ['ECONNREFUSED', 'ENOTFOUND', '3D000', '28P01'].includes(error.code) || /password|SASL/i.test(error.message || '')
  ? (error.code === '28P01' || /password|SASL/i.test(error.message || '') ? 'PostgreSQL credentials are incorrect. Update DATABASE_URL in .env, then load supabase/schema.sql.' : 'PostgreSQL is not available. Start PostgreSQL, create the skillconnect_hub database, and load supabase/schema.sql.')
  : 'Could not complete the request.';
process.on('unhandledRejection', (error) => console.error(`Request failed: ${databaseMessage(error)}`));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'SkillConnect-HUB API' }));

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role = 'customer' } = req.body;
  if (!name || !email || !password || !['customer', 'artisan'].includes(role)) return res.status(400).json({ message: 'Name, email, password, and account type are required.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  try {
    const { salt, hash } = hashPassword(password);
    const result = await pool.query('INSERT INTO users (name, email, password_hash, password_salt, role) VALUES ($1, LOWER($2), $3, $4, $5) RETURNING *', [name.trim(), email.trim(), hash, salt, role]);
    const session = newToken();
    await pool.query("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')", [result.rows[0].id, session]);
    res.status(201).json({ token: session, user: publicUser(result.rows[0]) });
  } catch (error) { res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'That email is already registered.' : databaseMessage(error) }); }
});

app.post('/api/auth/login', async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE email = LOWER($1)', [req.body.email || '']);
  const user = result.rows[0];
  if (!user || !validPassword(req.body.password || '', user.password_salt, user.password_hash)) return res.status(401).json({ message: 'Email or password is incorrect.' });
  const session = newToken();
  await pool.query("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')", [user.id, session]);
  res.json({ token: session, user: publicUser(user) });
});

app.get('/api/me', auth, async (req, res) => {
  const artisan = req.user.role === 'artisan' ? (await pool.query('SELECT * FROM artisans WHERE user_id = $1', [req.user.id])).rows[0] : null;
  res.json({ user: publicUser(req.user), artisan });
});

app.post('/api/artisan/profile', auth, artisanRequired, async (req, res) => {
  const { name, skill, area, bio, startingPrice, imageUrl } = req.body;
  if (!name || !skill || !area) return res.status(400).json({ message: 'Name, skill, and area are required.' });
  await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), req.user.id]);
  const result = await pool.query(`INSERT INTO artisans (user_id, skill, area, bio, starting_price, image_url) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id) DO UPDATE SET skill = EXCLUDED.skill, area = EXCLUDED.area, bio = EXCLUDED.bio, starting_price = EXCLUDED.starting_price, image_url = EXCLUDED.image_url RETURNING *`, [req.user.id, skill, area, bio || null, Number(startingPrice) || null, imageUrl || null]);
  res.status(201).json({ artisan: result.rows[0] });
});

app.get('/api/artisans', async (req, res) => {
  const result = await pool.query(`SELECT a.id, a.user_id AS "userId", u.name, a.skill, a.area, a.bio, a.starting_price AS "startingPrice", a.image_url AS "imageUrl" FROM artisans a JOIN users u ON u.id = a.user_id WHERE a.skill ILIKE $1 AND a.area ILIKE $2 ORDER BY a.created_at DESC`, [`%${req.query.service || ''}%`, `%${req.query.area || ''}%`]);
  res.json(result.rows);
});

app.get('/api/artisans/:id', async (req, res) => {
  const artisan = (await pool.query(`SELECT a.id, a.user_id AS "userId", u.name, a.skill, a.area, a.bio, a.starting_price AS "startingPrice", a.image_url AS "imageUrl" FROM artisans a JOIN users u ON u.id = a.user_id WHERE a.id = $1`, [req.params.id])).rows[0];
  if (!artisan) return res.status(404).json({ message: 'Artisan not found.' });
  const products = (await pool.query('SELECT id, name, description, price, image_url AS "imageUrl", in_stock AS "inStock" FROM products WHERE artisan_id = $1 ORDER BY created_at DESC', [artisan.id])).rows;
  res.json({ artisan, products });
});

app.post('/api/products', auth, artisanRequired, async (req, res) => {
  const { name, description, price, imageUrl, inStock = true } = req.body;
  const artisan = (await pool.query('SELECT id FROM artisans WHERE user_id = $1', [req.user.id])).rows[0];
  if (!artisan) return res.status(400).json({ message: 'Create your artisan profile first.' });
  if (!name || !price || !imageUrl) return res.status(400).json({ message: 'Product name, price, and photo URL are required.' });
  const result = await pool.query('INSERT INTO products (artisan_id, name, description, price, image_url, in_stock) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, description, price, image_url AS "imageUrl", in_stock AS "inStock"', [artisan.id, name, description || null, Number(price), imageUrl, inStock]);
  res.status(201).json({ product: result.rows[0] });
});

app.put('/api/products/:id', auth, artisanRequired, async (req, res) => {
  const { name, description, price, imageUrl, inStock } = req.body;
  const result = await pool.query(`UPDATE products p SET name = $1, description = $2, price = $3, image_url = $4, in_stock = $5 FROM artisans a WHERE p.id = $6 AND p.artisan_id = a.id AND a.user_id = $7 RETURNING p.id, p.name, p.description, p.price, p.image_url AS "imageUrl", p.in_stock AS "inStock"`, [name, description || null, Number(price), imageUrl, inStock, req.params.id, req.user.id]);
  if (!result.rows[0]) return res.status(404).json({ message: 'Product not found.' });
  res.json({ product: result.rows[0] });
});

app.delete('/api/products/:id', auth, artisanRequired, async (req, res) => {
  const result = await pool.query('DELETE FROM products p USING artisans a WHERE p.id = $1 AND p.artisan_id = a.id AND a.user_id = $2 RETURNING p.id', [req.params.id, req.user.id]);
  if (!result.rows[0]) return res.status(404).json({ message: 'Product not found.' });
  res.status(204).end();
});

app.get('/api/products', async (req, res) => {
  const result = await pool.query(`SELECT p.id, p.name, p.description, p.price, p.image_url AS "imageUrl", p.in_stock AS "inStock", a.id AS "artisanId", u.name AS "artisanName", a.skill, a.area FROM products p JOIN artisans a ON a.id = p.artisan_id JOIN users u ON u.id = a.user_id WHERE p.name ILIKE $1 AND a.area ILIKE $2 ORDER BY p.created_at DESC`, [`%${req.query.search || ''}%`, `%${req.query.area || ''}%`]);
  res.json(result.rows);
});

app.get('/api/conversations', auth, async (req, res) => {
  const result = await pool.query(`SELECT c.id, c.artisan_id AS "artisanId", u.name AS "artisanName", c.customer_id AS "customerId", cu.name AS "customerName", c.updated_at AS "updatedAt", (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS "lastMessage", (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND m.is_read = FALSE) AS "unreadCount" FROM conversations c JOIN artisans a ON a.id = c.artisan_id JOIN users u ON u.id = a.user_id JOIN users cu ON cu.id = c.customer_id WHERE c.customer_id = $1 OR a.user_id = $1 ORDER BY c.updated_at DESC`, [req.user.id]);
  res.json(result.rows);
});

app.post('/api/conversations', auth, async (req, res) => {
  const artisan = (await pool.query('SELECT id FROM artisans WHERE id = $1', [req.body.artisanId])).rows[0];
  if (!artisan || req.user.role === 'artisan') return res.status(400).json({ message: 'Choose a valid artisan.' });
  const result = await pool.query('INSERT INTO conversations (customer_id, artisan_id) VALUES ($1, $2) ON CONFLICT (customer_id, artisan_id) DO UPDATE SET updated_at = NOW() RETURNING id', [req.user.id, artisan.id]);
  res.status(201).json({ id: result.rows[0].id });
});

async function conversationAccess(req, res) {
  return (await pool.query('SELECT c.id FROM conversations c JOIN artisans a ON a.id = c.artisan_id WHERE c.id = $1 AND (c.customer_id = $2 OR a.user_id = $2)', [req.params.id, req.user.id])).rows[0];
}
app.get('/api/conversations/:id/messages', auth, async (req, res) => {
  if (!await conversationAccess(req, res)) return res.status(403).json({ message: 'Conversation not available.' });
  await pool.query('UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id <> $2', [req.params.id, req.user.id]);
  const result = await pool.query('SELECT m.id, m.body, m.image_url AS "imageUrl", m.sender_id AS "senderId", u.name AS "senderName", m.created_at AS "createdAt" FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = $1 ORDER BY m.created_at ASC', [req.params.id]);
  res.json(result.rows);
});
app.post('/api/conversations/:id/messages', auth, async (req, res) => {
  if (!await conversationAccess(req, res)) return res.status(403).json({ message: 'Conversation not available.' });
  if (!req.body.body && !req.body.imageUrl) return res.status(400).json({ message: 'Write a message or attach a photo.' });
  const result = await pool.query('INSERT INTO messages (conversation_id, sender_id, body, image_url) VALUES ($1, $2, $3, $4) RETURNING id, body, image_url AS "imageUrl", sender_id AS "senderId", created_at AS "createdAt"', [req.params.id, req.user.id, req.body.body || null, req.body.imageUrl || null]);
  await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [req.params.id]);
  res.status(201).json({ message: result.rows[0] });
});

pool.query('SELECT 1').then(() => console.log('PostgreSQL connected.')).catch((error) => console.error(`Database connection failed: ${databaseMessage(error)} Detail: ${error.message}`));
pool.on('error', (error) => console.error(`PostgreSQL pool error: ${error.message}`));
app.listen(port, () => console.log(`SkillConnect-HUB API running on port ${port}`));
