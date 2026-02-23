import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';

const router = Router();

// Fake login - just email
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find or create user
    const result = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    let userId: string;
    if (result.rows.length > 0) {
      userId = result.rows[0].id;
    } else {
      const newUserResult = await query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id',
        [email, name || email.split('@')[0]]
      );
      userId = newUserResult.rows[0].id;
    }

    // Set session
    (req.session as any).userId = userId;
    
    res.json({ 
      success: true, 
      userId,
      message: `Logged in as ${email}`
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
    const userId = (req as any).userId;
    
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
