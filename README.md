# TrustEscrow MVP

Verification-first escrow service for peer-to-peer commerce. Philippines market, launching with web app.

## Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **Frontend:** React + Next.js + TypeScript
- **Video:** Local storage (MVP)
- **Auth:** Session-based (fake login for MVP)

## Project Structure

```
trustescrow/
├── backend/          # Express API
├── frontend/         # Next.js web app
└── docs/            # Design docs & notes
```

## Quick Start

### Backend

```bash
cd backend
npm install
npm run dev
```

Runs on `http://localhost:3001`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`

## Database

PostgreSQL running on `localhost:5432`
Database: `trustescrow`
User: `trustescrow_user` / `dev_password`

Run migrations:
```bash
cd backend
npm run migrate
```

## MVP Features

- ✅ Fake login (session cookie)
- ✅ Buyer initiates escrow + funds
- ✅ Seller acknowledges transaction
- ✅ Seller item liveness scan (video upload)
- ✅ Buyer unboxing verification (video upload)
- ✅ Auto-release or manual dispute
- ✅ Basic honesty score
- ✅ Transaction state machine

## Missing (Phase 2+)

- Courier integrations
- Delivery insurance
- Packaging plausibility
- Advanced liveness (LiDAR, gyroscope)
- Partial dispute negotiation
- Return flows
- Real payment integration (GCash, Maya)
