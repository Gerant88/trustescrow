import { Router, Request, Response } from 'express';
import pool from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';

const router = Router();

function requireAuth(req: Request, res: Response, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

const videoDir = process.env.VIDEO_DIR || './videos';
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Raise dispute
router.post('/', requireAuth, upload.single('evidence'), async (req: Request, res: Response) => {
  const { escrowId, reason, disputedAmount } = req.body;
  const userId = req.session.userId;

  if (!escrowId || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const escrow = await pool.query('SELECT * FROM escrows WHERE id = $1', [escrowId]);
    if (escrow.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const e = escrow.rows[0];
    if (e.buyer_id !== userId && e.seller_id !== userId) {
      return res.status(403).json({ error: 'Only buyer or seller can raise dispute' });
    }

    if (e.state === 'COMPLETED' || e.state === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot dispute completed escrow' });
    }

    const disputeId = uuidv4();
    const videoUrl = req.file ? `/videos/${req.file.filename}` : null;

    await pool.query(
      `INSERT INTO disputes (id, escrow_id, raised_by, reason, evidence_video_url, status, disputed_amount) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [disputeId, escrowId, userId, reason, videoUrl, 'OPEN', disputedAmount || null]
    );

    // Update escrow state
    await pool.query(
      'UPDATE escrows SET state = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['DISPUTED', escrowId]
    );

    const result = await pool.query('SELECT * FROM disputes WHERE id = $1', [disputeId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to raise dispute' });
  }
});

// Get dispute
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM disputes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Seller proposes deduction (partial dispute)
router.post('/:id/propose-deduction', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { proposedDeduction } = req.body;
  const userId = req.session.userId;

  try {
    const dispute = await pool.query('SELECT * FROM disputes WHERE id = $1', [id]);
    if (dispute.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const d = dispute.rows[0];
    const escrow = await pool.query('SELECT * FROM escrows WHERE id = $1', [d.escrow_id]);
    const e = escrow.rows[0];

    if (e.seller_id !== userId) {
      return res.status(403).json({ error: 'Only seller can propose deduction' });
    }

    await pool.query(
      'UPDATE disputes SET seller_proposed_deduction = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [proposedDeduction, id]
    );

    const result = await pool.query('SELECT * FROM disputes WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Buyer accepts or counters deduction
router.post('/:id/respond-deduction', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { accepted, counterOffer } = req.body;
  const userId = req.session.userId;

  try {
    const dispute = await pool.query('SELECT * FROM disputes WHERE id = $1', [id]);
    if (dispute.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const d = dispute.rows[0];
    const escrow = await pool.query('SELECT * FROM escrows WHERE id = $1', [d.escrow_id]);
    const e = escrow.rows[0];

    if (e.buyer_id !== userId) {
      return res.status(403).json({ error: 'Only buyer can respond' });
    }

    if (accepted) {
      // Resolve with agreed deduction
      const sellerPayout = e.item_price - e.platform_fee - d.seller_proposed_deduction;
      const buyerRefund = d.seller_proposed_deduction + e.buyer_deposit;

      await pool.query(
        `UPDATE disputes SET status = $1, final_payout_seller = $2, final_payout_buyer = $3, resolved_at = CURRENT_TIMESTAMP WHERE id = $4`,
        ['RESOLVED', sellerPayout, buyerRefund, id]
      );

      await pool.query(
        `UPDATE escrows SET state = $1, resolution_outcome = $2, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        ['CLOSED', 'RESOLVED', d.escrow_id]
      );
    } else if (counterOffer !== undefined) {
      // Counter-offer
      await pool.query(
        'UPDATE disputes SET buyer_counter_offer = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [counterOffer, id]
      );
    }

    const result = await pool.query('SELECT * FROM disputes WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to respond' });
  }
});

export default router;
