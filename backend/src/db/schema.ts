export const SCHEMA_SQL = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  honesty_score_seller INT DEFAULT 100,
  honesty_score_buyer INT DEFAULT 100,
  total_transactions INT DEFAULT 0,
  account_status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Escrows (core transaction)
CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  state VARCHAR(50) DEFAULT 'CREATED',
  item_description TEXT NOT NULL,
  item_price DECIMAL(10, 2) NOT NULL,
  buyer_deposit DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) DEFAULT 0,
  expected_delivery_window VARCHAR(50),
  
  -- Verification data
  seller_liveness_video_url VARCHAR(500),
  seller_liveness_confidence INT,
  seller_scan_timestamp TIMESTAMP,
  seller_device_capability VARCHAR(50),
  
  buyer_unboxing_video_url VARCHAR(500),
  buyer_unboxing_confidence INT,
  buyer_unboxing_timestamp TIMESTAMP,
  
  -- Delivery
  delivered_at TIMESTAMP,
  delivery_confirmed_by VARCHAR(50),
  
  -- Resolution
  resolved_at TIMESTAMP,
  resolution_outcome VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_buyer ON buyer_id,
  INDEX idx_seller ON seller_id,
  INDEX idx_state ON state,
  INDEX idx_created ON created_at
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrows(id),
  raised_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  evidence_video_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'OPEN',
  tier INT DEFAULT 1,
  
  -- Partial dispute
  disputed_amount DECIMAL(10, 2),
  seller_proposed_deduction DECIMAL(10, 2),
  buyer_counter_offer DECIMAL(10, 2),
  
  -- Resolution
  resolved_at TIMESTAMP,
  resolution_outcome VARCHAR(50),
  final_payout_seller DECIMAL(10, 2),
  final_payout_buyer DECIMAL(10, 2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_escrow ON escrow_id,
  INDEX idx_status ON status
);

-- Transaction log (audit trail)
CREATE TABLE IF NOT EXISTS transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrows(id),
  event_type VARCHAR(100) NOT NULL,
  actor_id UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_escrow ON escrow_id,
  INDEX idx_event ON event_type
);

-- Sessions (for MVP fake login)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL,
  INDEX idx_expire ON expire
);
`;
