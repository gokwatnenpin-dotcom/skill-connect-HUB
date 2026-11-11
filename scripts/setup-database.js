import '../server/config/env.js';
import { pool } from '../src/db.js';
import { runMigrations } from '../server/migrations/index.js';

try {
  await runMigrations();
  console.log('SkillConnect-HUB database schema is ready.');
} catch (error) {
  console.error(`Database setup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
