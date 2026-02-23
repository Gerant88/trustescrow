import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'trustescrow',
  user: process.env.DB_USER || 'trustescrow_user',
  password: process.env.DB_PASSWORD || 'dev_password',
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

    console.log('✅ Database schema initialized');
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
