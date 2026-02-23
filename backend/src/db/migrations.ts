import pool from './db';
import { SCHEMA_SQL } from './schema';

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(SCHEMA_SQL);
    console.log('✅ Migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigrations();
