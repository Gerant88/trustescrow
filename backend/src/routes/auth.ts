import { Router, Request, Response } from 'express';
import pool from '../db/db';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      session: any;
    }
  }
}

const router = Router();

// Get current user or redirect to login
router.get('/me', async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, honesty_score_seller, honesty_score_buyer, total_transactions FROM users WHERE id = $1',
      [req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Fake login - create user if doesn't exist
router.post('/login', async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  try {
    let user = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

    if (user.rows.length === 0) {
      // Create new user
      const userId = uuidv4();
      await pool.query(
        'INSERT INTO users (id, username) VALUES ($1, $2)',
        [userId, username]
      );
      req.session.userId = userId;
    } else {
      req.session.userId = user.rows[0].id;
    }

    // Get user data
    const userResult = await pool.query(
      'SELECT id, username, honesty_score_seller, honesty_score_buyer, total_transactions FROM users WHERE id = $1',
      [req.session.userId]
    );

    res.json({ success: true, user: userResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

export default router;
