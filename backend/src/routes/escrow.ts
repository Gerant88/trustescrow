import { Router, Request, Response } from 'express';
import pool from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure authenticated
function requireAuth(req: Request, res: Response, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// File upload config
const videoDir = process.env.VIDEO_DIR || './videos';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

// Create escrow
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { sellerId, itemDescription, itemPrice, expectedDeliveryWindow } = req.body;
  const buyerId = req.session.userId;

  if (!sellerId || !itemDescription || !itemPrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (buyerId === sellerId) {
    return res.status(400).json({ error: 'Cannot trade with yourself' });
  }

  try {
    const escrowId = uuidv4();
    const buyerDeposit = itemPrice * 2; // 2x deposit
    const platformFee = itemPrice * 0.03; // 3% for MVP

    await pool.query(
      `INSERT INTO escrows (
        id, buyer_id, seller_id, state, item_description, item_price, 
        buyer_deposit, platform_fee, expected_delivery_window
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [escrowId, buyerId, sellerId, 'CREATED', itemDescription, itemPrice, buyerDeposit, platformFee, expectedDeliveryWindow]
    );

    // Log transaction
    await pool.query(
      `INSERT INTO transaction_logs (escrow_id, event_type, actor_id, details) 
       VALUES ($1, $2, $3, $4)`,
      [escrowId, 'ESCROW_CREATED', buyerId, JSON.stringify({ itemPrice, buyerDeposit })]
    );

    const result = await pool.query('SELECT * FROM escrows WHERE id = $1', [escrowId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create escrow' });
  }
});

// Get escrow
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.session.userId;

  try {
    const result = await pool.query(
      'SELECT * FROM escrows WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// List user's escrows
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId;
  const { role } = req.query; // 'buyer' or 'seller'

  try {
    let query = 'SELECT * FROM escrows WHERE (buyer_id = $1 OR seller_id = $1) ORDER BY created_at DESC';
    const params = [userId];

    if (role === 'buyer') {
      query = 'SELECT * FROM escrows WHERE buyer_id = $1 ORDER BY created_at DESC';
    } else if (role === 'seller') {
      query = 'SELECT * FROM escrows WHERE seller_id = $1 ORDER BY created_at DESC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Seller acknowledges
router.post('/:id/acknowledge', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const sellerId = req.session.userId;

  try {
    const escrow = await pool.query('SELECT * FROM escrows WHERE id = $1', [id]);
    if (escrow.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const e = escrow.rows[0];
    if (e.seller_id !== sellerId) {
      return res.status(403).json({ error: 'Only seller can acknowledge' });
    }

    if (e.state !== 'CREATED') {
      return res.status(400).json({ error: `Cannot acknowledge from state: ${e.state}` });
    }

    await pool.query(
      'UPDATE escrows SET state = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['ACKNOWLEDGED', id]
    );

    await pool.query(
      `INSERT INTO transaction_logs (escrow_id, event_type, actor_id) VALUES ($1, $2, $3)`,
      [id, 'SELLER_ACKNOWLEDGED', sellerId]
    );

    const result = await pool.query('SELECT * FROM escrows WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Seller uploads liveness scan
router.post('/:id/scan', requireAuth, upload.single('video'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const sellerId = req.session.userId;

  if (!req.file) {
    return res.status(400).json({ error: 'No video uploaded' });
  }

  try {
    const escrow = await pool.query('SELECT * FROM escrows WHERE id = $1', [id]);
    if (escrow.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const e = escrow.rows[0];
    if (e.seller_id !== sellerId) {
      return res.status(403).json({ error: 'Only seller can scan' });
    }

    if (e.state !== 'ACKNOWLEDGED') {
      return res.status(400).json({ error: `Cannot scan from state: ${e.state}` });
    }

    // Mock confidence score (in production, would run AI)
    const confidence = 85 + Math.random() * 10;

    const videoUrl = `/videos/${req.file.filename}`;

    await pool.query(
      `UPDATE escrows SET 
        state = $1, 
        seller_liveness_video_url = $2, 
        seller_liveness_confidence = $3,
        seller_scan_timestamp = CURRENT_TIMESTAMP,
        seller_device_capability = $4,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5`,
      ['SCANNED', videoUrl, Math.round(confidence), 'full-capability', id]
    );

    const result = await pool.query('SELECT * FROM escrows WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process scan' });
  }
});

// Buyer uploads unboxing verification
router.post('/:id/unbox', requireAuth, upload.single('video'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const buyerId = req.session.userId;

  if (!req.file) {
    return res.status(400).json({ error: 'No video uploaded' });
  }

  try {
    const escrow = await pool.query('SELECT * FROM escrows WHERE id = $1', [id]);
    if (escrow.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const e = escrow.rows[0];
    if (e.buyer_id !== buyerId) {
      return res.status(403).json({ error: 'Only buyer can unbox' });
    }

    if (e.state !== 'IN_TRANSIT') {
      return res.status(400).json({ error: `Cannot unbox from state: ${e.state}` });
    }

    // Mock confidence score
    const confidence = 80 + Math.random() * 15;

    const videoUrl = `/videos/${req.file.filename}`;

    await pool.query(
      `UPDATE escrows SET 
        state = $1, 
        buyer_unboxing_video_url = $2, 
        buyer_unboxing_confidence = $3,
        buyer_unboxing_timestamp = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4`,
      ['COMPLETED', videoUrl, Math.round(confidence), id]
    );

    // Auto-release payment to seller
    await pool.query(
      `INSERT INTO transaction_logs (escrow_id, event_type, details) 
       VALUES ($1, $2, $3)`,
      [id, 'AUTO_RELEASE_PAYMENT', JSON.stringify({ seller_receives: e.item_price - e.platform_fee })]
    );

    const result = await pool.query('SELECT * FROM escrows WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process unboxing' });
  }
});

export default router;
