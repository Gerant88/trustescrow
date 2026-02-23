# Architecture Overview

## High Level

```
┌─────────────────────┐
│   Frontend (React)  │
│   Next.js on :3000  │
└──────────┬──────────┘
           │ HTTP + WebSockets (future)
           ↓
┌─────────────────────┐
│  Backend (Express)  │
│   Node.js on :3001  │
└──────────┬──────────┘
           │ SQL Queries + Sessions
           ↓
┌─────────────────────┐
│  PostgreSQL :5432   │
│  trustescrow DB     │
└─────────────────────┘
           ↓ (local storage)
┌─────────────────────┐
│  Videos / Images    │
│  /videos, /uploads  │
└─────────────────────┘
```

## Backend Structure

```
backend/
├── src/
│   ├── server.ts          # Express app entry
│   ├── db/
│   │   ├── index.ts       # DB connection + schema init
│   │   └── migrations.ts  # (future)
│   ├── routes/
│   │   ├── auth.ts        # Login/logout/me
│   │   ├── escrow.ts      # Create/acknowledge/upload
│   │   ├── dispute.ts     # Raise/resolve
│   │   └── user.ts        # Profile/stats
│   ├── middleware/        # (future: auth, error handling)
│   └── utils/             # (future: helpers)
├── .env.example
├── tsconfig.json
└── package.json
```

## Frontend Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── index.tsx          # Login page
│   │   ├── dashboard.tsx      # Main dashboard
│   │   ├── escrow/
│   │   │   ├── create.tsx     # Create escrow
│   │   │   └── [id].tsx       # Detail + actions
│   │   └── _app.tsx           # App wrapper + auth check
│   ├── lib/
│   │   └── api.ts             # Axios client + endpoints
│   ├── store/
│   │   └── authStore.ts       # Zustand for auth state
│   ├── styles/
│   │   └── global.css
│   ├── components/            # (future: reusable UI)
│   └── types/                 # (future: TypeScript interfaces)
├── next.config.js
├── tsconfig.json
└── package.json
```

## Data Flow

### Creating an Escrow

```
User fills form
  ↓
Frontend POST /api/escrow/create { itemName, itemValue, ... }
  ↓
Backend creates Escrow record (state: CREATED)
  ↓
Returns escrow ID + share link
  ↓
Backend logs action to transaction_log
  ↓
Frontend shows confirmation
```

### Seller Acknowledges

```
Seller opens link / logged in
  ↓
Frontend POST /api/escrow/:id/acknowledge
  ↓
Backend updates Escrow.state = ACKNOWLEDGED, sets seller_id
  ↓
Logs action
  ↓
Frontend updates UI to show scan step
```

### Verification Upload

```
Seller selects video file
  ↓
Frontend POST /api/escrow/:id/upload-verification { verificationType, videoData }
  ↓
Backend stores video path, creates Verification record
  ↓
Updates Escrow.state based on verification_type
  ↓
Returns verification ID + confidence score
  ↓
Frontend updates UI to next step
```

## State Management

### Frontend (Zustand)
- `authStore`: User state + login/logout actions
- (future) `escrowStore`: Current escrow + transactions

### Backend (PostgreSQL)
- All persistent state in database
- Session cookies for auth
- Transaction log for audit trail

## Extensibility (Phase 2+)

### Adding Courier Integration
1. Add `couriers` table
2. Add courier_id to Escrows
3. Add new verification type: COURIER_PICKUP_SCAN
4. New route: `POST /api/escrow/:id/courier/pickup-scan`

### Adding Insurance
1. Add `insurance_policies` table
2. Add insurance_id to Escrows
3. New route: `POST /api/escrow/:id/purchase-insurance`
4. New route: `POST /api/insurance/:id/claim`

### Adding Payment Integration
1. Replace fake balance logic with real GCash API calls
2. Create `payments` table
3. Add webhooks for payment confirmation
4. Routes: `POST /api/payment/initiate`, webhook handler

### Adding Advanced Liveness
1. Add liveness detection library (TensorFlow.js or similar)
2. Client-side video processing before upload
3. Enhanced confidence scoring
4. New device capability levels

## Future Improvements

- WebSocket for real-time updates
- Email notifications
- File upload service (S3/Cloudinary)
- Rate limiting + API key auth
- Better error handling + logging
- Unit + integration tests
- CI/CD pipeline
- Monitoring + analytics
