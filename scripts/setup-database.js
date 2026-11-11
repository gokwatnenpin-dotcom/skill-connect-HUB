import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
try {
  const schema = await fs.readFile(path.join(root, 'supabase', 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('SkillConnect-HUB database schema is ready.');
} catch (error) {
  console.error(`Database setup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
