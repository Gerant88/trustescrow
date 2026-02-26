import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'trustescrow',
  user: process.env.DB_USER || 'trustescrow_user',
  password: process.env.DB_PASSWORD || 'dev_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        buyer_score FLOAT DEFAULT 100,
        seller_score FLOAT DEFAULT 100,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Escrows table
    await client.query(`
      CREATE TABLE IF NOT EXISTS escrows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id UUID NOT NULL REFERENCES users(id),
        seller_id UUID REFERENCES users(id),
        state VARCHAR(50) DEFAULT 'CREATED',
        item_name VARCHAR(500),
        item_value FLOAT NOT NULL,
        item_description TEXT,
        platform_source VARCHAR(100),
        listing_url TEXT,
        expected_delivery_window VARCHAR(100),
        buyer_deposit FLOAT,
        platform_fee FLOAT,
        seller_receives FLOAT,
        buyer_insurance_purchased BOOLEAN DEFAULT FALSE,
        buyer_insurance_premium FLOAT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Verification records
    await client.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        escrow_id UUID NOT NULL REFERENCES escrows(id),
        verification_type VARCHAR(50),
        user_id UUID NOT NULL REFERENCES users(id),
        video_path VARCHAR(500),
        confidence_score FLOAT,
        device_capability VARCHAR(50),
        gps_timestamp TIMESTAMP,
        device_fingerprint VARCHAR(255),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Disputes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        escrow_id UUID NOT NULL REFERENCES escrows(id),
        raised_by_id UUID NOT NULL REFERENCES users(id),
        dispute_type VARCHAR(50),
        tier INT DEFAULT 1,
        reason TEXT,
        evidence_json TEXT,
        status VARCHAR(50) DEFAULT 'OPEN',
        resolution_text TEXT,
        resolved_for VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Transaction log (audit trail)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transaction_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        escrow_id UUID NOT NULL REFERENCES escrows(id),
        action VARCHAR(100),
        actor_id UUID REFERENCES users(id),
        metadata_json TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Indexes for common query patterns
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_escrows_buyer_id ON escrows(buyer_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_escrows_seller_id ON escrows(seller_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_escrows_state ON escrows(state);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verifications_escrow_id ON verifications(escrow_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_disputes_escrow_id ON disputes(escrow_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_disputes_raised_by_id ON disputes(raised_by_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_log_escrow_id ON transaction_log(escrow_id);
    `);

    console.log('✅ Database schema and indexes initialized');
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
