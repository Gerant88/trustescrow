import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email required' });
    }
    if (email.length > 255) {
      return res.status(400).json({ error: 'Email too long' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (name !== undefined && (typeof name !== 'string' || name.length > 255)) {
      return res.status(400).json({ error: 'Name must be a string under 255 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user
    const result = await query(
      'SELECT id, email, name, buyer_score, seller_score FROM users WHERE email = $1',
      [normalizedEmail]
    );

    let user: { id: string; email: string; name: string; buyer_score: number; seller_score: number };
    if (result.rows.length > 0) {
      user = result.rows[0];
    } else {
      const safeName = (name || normalizedEmail.split('@')[0]).trim().slice(0, 255);
      const newUserResult = await query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, buyer_score, seller_score',
        [normalizedEmail, safeName]
      );
      user = newUserResult.rows[0];
    }

    (req.session as any).userId = user.id;

    res.json({
      success: true,
      id: user.id,
      email: user.email,
      name: user.name,
      buyer_score: user.buyer_score,
      seller_score: user.seller_score,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const result = await query(
      'SELECT id, email, name, buyer_score, seller_score FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
