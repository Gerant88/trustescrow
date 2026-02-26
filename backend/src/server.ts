import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initDb } from './db';
import authRoutes from './routes/auth';
import escrowRoutes from './routes/escrow';
import disputeRoutes from './routes/dispute';
import userRoutes from './routes/user';

dotenv.config();

// Fail fast on missing critical secrets in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is required in production');
    process.exit(1);
  }
  if (!process.env.DB_PASSWORD) {
    console.error('FATAL: DB_PASSWORD environment variable is required in production');
    process.exit(1);
  }
} else {
  if (!process.env.SESSION_SECRET) {
    console.warn('WARNING: SESSION_SECRET not set — using insecure default (dev only)');
  }
}

// Extend Express Request type to carry userId cleanly
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Global rate limiter — 100 req/15min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

// Stricter limiter for auth endpoints — 10 attempts/15min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

// Auth middleware — attach userId from session to every request
app.use((req: Request, res: Response, next: NextFunction) => {
  req.userId = (req.session as any)?.userId;
  next();
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/dispute', disputeRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await initDb();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`TrustEscrow API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
