# TrustEscrow MVP Specification

## Scope

This MVP focuses on the core escrow + verification flow with minimal features for rapid iteration.

### Included

- Buyer initiates escrow with item details
- Seller acknowledges transaction
- Seller performs liveness scan (video upload)
- Buyer unboxing verification (video upload)
- Auto-release on matched verification
- Manual dispute resolution
- Basic honesty scores (static for MVP)
- Session-based fake login

### Out of Scope (Phase 2+)

- Courier integrations (verified/unverified tracks)
- Delivery insurance
- Packaging plausibility AI
- Advanced liveness (LiDAR, gyroscope correlation)
- Partial dispute negotiation flow
- Return shipments
- Real payment integration
- KYC/identity verification
- Regulatory compliance

## Tech Stack

- **Backend:** Node.js 22 + Express + TypeScript
- **Frontend:** Next.js 14 + React 18 + TypeScript
- **Database:** PostgreSQL 15
- **Storage:** Local filesystem (videos, images)
- **Auth:** Session-based with cookies

## Database Schema

### Users
- id (UUID)
- email (unique)
- name
- buyer_score (0-100)
- seller_score (0-100)
- created_at, updated_at

### Escrows
- id (UUID)
- buyer_id (FK users)
- seller_id (FK users, nullable until acknowledged)
- state (CREATED → ACKNOWLEDGED → SCANNING → SCANNED → IN_TRANSIT → DELIVERED → UNBOXING → COMPLETED/DISPUTED → CLOSED)
- item details (name, value, description, platform source, URL)
- expected_delivery_window
- buyer_deposit, platform_fee, seller_receives
- buyer_insurance_purchased (false for MVP)
- created_at, updated_at

### Verifications
- id (UUID)
- escrow_id (FK escrows)
- verification_type (SELLER_LIVENESS, BUYER_UNBOXING)
- user_id (FK users)
- video_path
- confidence_score
- device_capability (FULL, PARTIAL, BASIC)
- gps_timestamp, device_fingerprint
- status (PENDING, VERIFIED, REJECTED)
- created_at

### Disputes
- id (UUID)
- escrow_id (FK escrows)
- raised_by_id (FK users)
- dispute_type (ITEM_MISMATCH, NON_DELIVERY, DAMAGE, OTHER)
- tier (1 = auto-AI, 2 = human review, 3 = senior)
- reason
- evidence_json
- status (OPEN, RESOLVED)
- resolution_text
- resolved_for (BUYER, SELLER)
- created_at, updated_at

### Transaction Log
- Audit trail of all state changes + actions

## State Machine

```
CREATED (buyer funded)
  ↓ [seller acknowledges]
ACKNOWLEDGED (seller confirmed)
  ↓ [seller completes liveness scan]
SCANNING
  ↓ [scan complete]
SCANNED (ready for shipment)
  ↓ [in transit]
IN_TRANSIT
  ↓ [delivery confirmed]
DELIVERED (ready for buyer unboxing)
  ↓ [buyer opens package & verifies]
UNBOXING
  ↓ [verification matches]
COMPLETED (payment released)

OR at any point:
  ↓ [dispute raised]
DISPUTED
  ↓ [manual resolution]
CLOSED

Also: CANCELLED (before acknowledged)
```

## Cancellation Rules (MVP Simplified)

- **Before ACKNOWLEDGED:** Buyer can cancel freely, full refund
- **Before SCANNED:** Either party can cancel, full refund
- **After SCANNED:** No cancellation, must go through dispute

## Dispute Flow (MVP Simplified)

Tier 1 (Auto): AI compares videos, resolves if high confidence
Tier 2 (Manual): You (admin) review and decide
Tier 3 (N/A for MVP): N/A

## API Routes

### Auth
- `POST /api/auth/login` - fake login (email + name)
- `POST /api/auth/logout`
- `GET /api/auth/me` - current user

### Escrow
- `POST /api/escrow/create` - buyer creates
- `GET /api/escrow/:id` - get details
- `GET /api/escrow/` - list user's escrows
- `POST /api/escrow/:id/acknowledge` - seller acknowledges
- `POST /api/escrow/:id/upload-verification` - upload video

### Dispute
- `POST /api/dispute/:escrowId/raise` - raise dispute
- `GET /api/dispute/:id` - get dispute
- `POST /api/dispute/:id/resolve` - resolve (manual)

### User
- `GET /api/user/profile` - get profile
- `GET /api/user/stats` - get stats

## Frontend Pages

- `/` - Login
- `/dashboard` - Main dashboard + escrow list
- `/escrow/create` - Create new escrow
- `/escrow/[id]` - Escrow detail + action center

## Development

### Setup

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev
# Runs on http://localhost:3001

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
# Runs on http://localhost:3000
```

### Testing the Flow

1. Open http://localhost:3000
2. Login as buyer (email: buyer@test.com)
3. Create new escrow
4. Share link with seller
5. Open link, login as seller (email: seller@test.com)
6. Seller acknowledges
7. Seller uploads liveness video
8. Buyer receives, uploads unboxing video
9. Payment releases automatically or go to dispute

## Notes

- Videos stored locally in `backend/videos/` for MVP
- Confidence scoring mocked at 0.95 for all verifications
- Honesty scores static (no calculation yet)
- No real payment integration
- No email notifications
