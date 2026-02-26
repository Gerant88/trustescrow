import { Router, Request, Response } from 'express';
import { query, pool } from '../db';

const router = Router();

const VALID_PLATFORM_SOURCES = ['facebook-marketplace', 'olx', 'shopee', 'lazada', 'other'];
const VALID_DELIVERY_WINDOWS = ['1-3 days', '3-7 days', '1-2 weeks'];
const VALID_VERIFICATION_TYPES = ['SELLER_LIVENESS', 'BUYER_UNBOXING'] as const;
const URL_REGEX = /^https?:\/\/.{1,2000}$/;

// Create escrow (buyer initiates)
router.post('/create', async (req: Request, res: Response) => {
  try {
    const buyerId = req.userId;
    if (!buyerId) return res.status(401).json({ error: 'Not logged in' });

    const {
      itemName,
      itemValue,
      itemDescription,
      platformSource,
      listingUrl,
      expectedDeliveryWindow,
    } = req.body;

    // Required field validation
    if (!itemName || typeof itemName !== 'string' || itemName.trim().length === 0) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    if (itemName.length > 500) {
      return res.status(400).json({ error: 'Item name must be under 500 characters' });
    }

    const parsedValue = Number(itemValue);
    if (!itemValue || isNaN(parsedValue)) {
      return res.status(400).json({ error: 'Item value is required and must be a number' });
    }
    if (parsedValue < 100 || parsedValue > 1_000_000) {
      return res.status(400).json({ error: 'Item value must be between ₱100 and ₱1,000,000' });
    }

    if (itemDescription && (typeof itemDescription !== 'string' || itemDescription.length > 5000)) {
      return res.status(400).json({ error: 'Description must be under 5,000 characters' });
    }

    if (platformSource && !VALID_PLATFORM_SOURCES.includes(platformSource)) {
      return res.status(400).json({ error: 'Invalid platform source' });
    }

    if (listingUrl) {
      if (typeof listingUrl !== 'string' || !URL_REGEX.test(listingUrl)) {
        return res.status(400).json({ error: 'Listing URL must be a valid http/https URL' });
      }
    }

    if (expectedDeliveryWindow && !VALID_DELIVERY_WINDOWS.includes(expectedDeliveryWindow)) {
      return res.status(400).json({ error: 'Invalid delivery window' });
    }

    const buyerDeposit = parsedValue * 2;
    const platformFee = parsedValue * 0.04;
    const sellerReceives = parsedValue - platformFee;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO escrows
         (buyer_id, item_name, item_value, item_description, platform_source,
          listing_url, expected_delivery_window, buyer_deposit, platform_fee, seller_receives, state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CREATED')
         RETURNING id, state, created_at`,
        [
          buyerId, itemName.trim(), parsedValue, itemDescription || null,
          platformSource || null, listingUrl || null, expectedDeliveryWindow || null,
          buyerDeposit, platformFee, sellerReceives,
        ]
      );

      const escrowId = result.rows[0].id;

      await client.query(
        `INSERT INTO transaction_log (escrow_id, action, actor_id, metadata_json)
         VALUES ($1, $2, $3, $4)`,
        [escrowId, 'ESCROW_CREATED', buyerId, JSON.stringify({ itemValue: parsedValue, buyerDeposit })]
      );

      await client.query('COMMIT');

      res.status(201).json({
        escrowId,
        state: 'CREATED',
        buyerDeposit,
        platformFee,
        sellerReceives,
        shareLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/escrow/${escrowId}`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create escrow error:', error);
    res.status(500).json({ error: 'Failed to create escrow' });
  }
});

// Get escrow details — only accessible to buyer or seller
router.get('/:escrowId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const { escrowId } = req.params;

    const result = await query(
      `SELECT e.*,
              b.name AS buyer_name, b.email AS buyer_email,
              s.name AS seller_name, s.email AS seller_email
       FROM escrows e
       LEFT JOIN users b ON b.id = e.buyer_id
       LEFT JOIN users s ON s.id = e.seller_id
       WHERE e.id = $1`,
      [escrowId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const escrow = result.rows[0];

    // Only buyer or seller may view
    if (escrow.buyer_id !== userId && escrow.seller_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(escrow);
  } catch (error) {
    console.error('Get escrow error:', error);
    res.status(500).json({ error: 'Failed to get escrow' });
  }
});

// Seller acknowledges — the caller becomes the seller; buyer cannot acknowledge their own escrow
router.post('/:escrowId/acknowledge', async (req: Request, res: Response) => {
  try {
    const sellerId = req.userId;
    if (!sellerId) return res.status(401).json({ error: 'Not logged in' });

    const { escrowId } = req.params;

    // Fetch escrow first to prevent the buyer from self-acknowledging
    const check = await query(
      `SELECT buyer_id, seller_id, state FROM escrows WHERE id = $1`,
      [escrowId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const escrow = check.rows[0];

    if (escrow.buyer_id === sellerId) {
      return res.status(400).json({ error: 'Buyer cannot acknowledge their own escrow' });
    }
    if (escrow.seller_id !== null && escrow.seller_id !== sellerId) {
      return res.status(400).json({ error: 'This escrow already has a seller' });
    }
    if (escrow.state !== 'CREATED') {
      return res.status(400).json({ error: 'Escrow is not in CREATED state' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE escrows SET state = 'ACKNOWLEDGED', seller_id = $1, updated_at = NOW()
         WHERE id = $2 AND state = 'CREATED'`,
        [sellerId, escrowId]
      );

      await client.query(
        `INSERT INTO transaction_log (escrow_id, action, actor_id) VALUES ($1, $2, $3)`,
        [escrowId, 'ESCROW_ACKNOWLEDGED', sellerId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ state: 'ACKNOWLEDGED' });
  } catch (error) {
    console.error('Acknowledge error:', error);
    res.status(500).json({ error: 'Failed to acknowledge escrow' });
  }
});

// Upload verification — enforces who can upload which type and at which state
router.post('/:escrowId/upload-verification', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const { escrowId } = req.params;
    const { verificationType, videoData } = req.body;

    if (!verificationType || !VALID_VERIFICATION_TYPES.includes(verificationType)) {
      return res.status(400).json({
        error: `verificationType must be one of: ${VALID_VERIFICATION_TYPES.join(', ')}`,
      });
    }
    if (!videoData || typeof videoData !== 'string' || videoData.length > 1000) {
      return res.status(400).json({ error: 'videoData is required' });
    }

    const check = await query(
      `SELECT buyer_id, seller_id, state FROM escrows WHERE id = $1`,
      [escrowId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const escrow = check.rows[0];

    // Authorization + state machine enforcement
    if (verificationType === 'SELLER_LIVENESS') {
      if (escrow.seller_id !== userId) {
        return res.status(403).json({ error: 'Only the seller may upload a liveness scan' });
      }
      if (escrow.state !== 'ACKNOWLEDGED') {
        return res.status(400).json({ error: 'Escrow must be in ACKNOWLEDGED state for liveness scan' });
      }
    } else if (verificationType === 'BUYER_UNBOXING') {
      if (escrow.buyer_id !== userId) {
        return res.status(403).json({ error: 'Only the buyer may upload an unboxing video' });
      }
      if (escrow.state !== 'SCANNING') {
        return res.status(400).json({ error: 'Escrow must be in SCANNING state for unboxing upload' });
      }
    }

    const videoPath = `/videos/${escrowId}-${verificationType}-${Date.now()}.webm`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO verifications
         (escrow_id, verification_type, user_id, video_path, confidence_score, device_capability, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
         RETURNING id`,
        [escrowId, verificationType, userId, videoPath, 0.95, 'FULL']
      );

      if (verificationType === 'SELLER_LIVENESS') {
        await client.query(
          `UPDATE escrows SET state = 'SCANNING', updated_at = NOW()
           WHERE id = $1 AND state = 'ACKNOWLEDGED'`,
          [escrowId]
        );
        await client.query(
          `INSERT INTO transaction_log (escrow_id, action, actor_id) VALUES ($1, $2, $3)`,
          [escrowId, 'SELLER_LIVENESS_UPLOADED', userId]
        );
      } else if (verificationType === 'BUYER_UNBOXING') {
        await client.query(
          `UPDATE escrows SET state = 'COMPLETED', updated_at = NOW()
           WHERE id = $1 AND state = 'SCANNING'`,
          [escrowId]
        );
        await client.query(
          `INSERT INTO transaction_log (escrow_id, action, actor_id) VALUES ($1, $2, $3)`,
          [escrowId, 'BUYER_UNBOXING_UPLOADED', userId]
        );
        // Update honesty scores for both parties on successful completion
        await client.query(
          `UPDATE users SET buyer_score = LEAST(buyer_score + 5, 200), updated_at = NOW()
           WHERE id = $1`,
          [escrow.buyer_id]
        );
        await client.query(
          `UPDATE users SET seller_score = LEAST(seller_score + 5, 200), updated_at = NOW()
           WHERE id = $1`,
          [escrow.seller_id]
        );
      }

      await client.query('COMMIT');

      res.json({
        verificationId: result.rows[0].id,
        videoPath,
        confidenceScore: 0.95,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Upload verification error:', error);
    res.status(500).json({ error: 'Failed to upload verification' });
  }
});

// List user's escrows with buyer/seller names joined
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const result = await query(
      `SELECT e.*,
              b.name AS buyer_name,
              s.name AS seller_name
       FROM escrows e
       LEFT JOIN users b ON b.id = e.buyer_id
       LEFT JOIN users s ON s.id = e.seller_id
       WHERE e.buyer_id = $1 OR e.seller_id = $1
       ORDER BY e.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('List escrows error:', error);
    res.status(500).json({ error: 'Failed to list escrows' });
  }
});

export default router;
