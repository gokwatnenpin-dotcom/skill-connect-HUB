import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../../src/db.js';

export async function runMigrations() {
  const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
  const schema = await fs.readFile(path.join(root, 'supabase', 'schema.sql'), 'utf8');
  await pool.query(schema);
}
