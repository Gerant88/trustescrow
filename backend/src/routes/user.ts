import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get user profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const result = await query(
      `SELECT id, email, name, buyer_score, seller_score, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get user stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const escrowResult = await query(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN state = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN state = 'DISPUTED' THEN 1 ELSE 0 END) as disputed
       FROM escrows WHERE buyer_id = $1 OR seller_id = $1`,
      [userId]
    );

    const userResult = await query(
      `SELECT buyer_score, seller_score FROM users WHERE id = $1`,
      [userId]
    );

    res.json({
      escrows: escrowResult.rows[0],
      scores: userResult.rows[0]
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});


// added endpoint to create user (for testing purposes)
router.post('/create', async (req: Request, res: Response) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }
  try {
    const result = await query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name',
      [email, name || email.split('@')[0]]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});


export default router;
