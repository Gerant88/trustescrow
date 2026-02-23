import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';

const router = Router();

// Create escrow (buyer initiates)
router.post('/create', async (req: Request, res: Response) => {
  try {
    const buyerId = (req as any).userId;
    if (!buyerId) return res.status(401).json({ error: 'Not logged in' });

    const {
      itemName,
      itemValue,
      itemDescription,
      platformSource,
      listingUrl,
      expectedDeliveryWindow
    } = req.body;

    if (!itemName || !itemValue) {
      return res.status(400).json({ error: 'Item name and value required' });
    }

    const buyerDeposit = itemValue * 2;
    const platformFee = itemValue * 0.04; // 4% for MVP
    const sellerReceives = itemValue - platformFee;

    const result = await query(
      `INSERT INTO escrows 
       (buyer_id, item_name, item_value, item_description, platform_source, 
        listing_url, expected_delivery_window, buyer_deposit, platform_fee, seller_receives, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CREATED')
       RETURNING id, state, created_at`,
      [buyerId, itemName, itemValue, itemDescription, platformSource, listingUrl, 
       expectedDeliveryWindow, buyerDeposit, platformFee, sellerReceives]
    );

    const escrowId = result.rows[0].id;

    // Log action
    await query(
      `INSERT INTO transaction_log (escrow_id, action, actor_id, metadata_json)
       VALUES ($1, $2, $3, $4)`,
      [escrowId, 'ESCROW_CREATED', buyerId, JSON.stringify({ itemValue, buyerDeposit })]
    );

    res.status(201).json({
      escrowId,
      state: 'CREATED',
      buyerDeposit,
      platformFee,
      sellerReceives,
      shareLink: `${process.env.FRONTEND_URL}/escrow/${escrowId}`
    });
  } catch (error) {
    console.error('Create escrow error:', error);
    res.status(500).json({ error: 'Failed to create escrow' });
  }
});

// Get escrow details
router.get('/:escrowId', async (req: Request, res: Response) => {
  try {
    const { escrowId } = req.params;

    const result = await query(
      `SELECT * FROM escrows WHERE id = $1`,
      [escrowId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get escrow error:', error);
    res.status(500).json({ error: 'Failed to get escrow' });
  }
});

// Seller acknowledges
router.post('/:escrowId/acknowledge', async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).userId;
    if (!sellerId) return res.status(401).json({ error: 'Not logged in' });

    const { escrowId } = req.params;

    const result = await query(
      `UPDATE escrows SET state = 'ACKNOWLEDGED', seller_id = $1, updated_at = NOW()
       WHERE id = $2 AND state = 'CREATED'
       RETURNING state`,
      [sellerId, escrowId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Escrow not in CREATED state or not found' });
    }

    await query(
      `INSERT INTO transaction_log (escrow_id, action, actor_id) VALUES ($1, $2, $3)`,
      [escrowId, 'ESCROW_ACKNOWLEDGED', sellerId]
    );

    res.json({ state: 'ACKNOWLEDGED' });
  } catch (error) {
    console.error('Acknowledge error:', error);
    res.status(500).json({ error: 'Failed to acknowledge escrow' });
  }
});

// Upload verification video
router.post('/:escrowId/upload-verification', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const { escrowId } = req.params;
    const { verificationType, videoData } = req.body;

    if (!verificationType || !videoData) {
      return res.status(400).json({ error: 'Verification type and video data required' });
    }

    // For MVP: store video path as placeholder
    const videoPath = `/videos/${escrowId}-${verificationType}-${Date.now()}.webm`;

    const result = await query(
      `INSERT INTO verifications 
       (escrow_id, verification_type, user_id, video_path, confidence_score, device_capability, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
       RETURNING id`,
      [escrowId, verificationType, userId, videoPath, 0.95, 'FULL']
    );

    // Update escrow state based on verification type
    if (verificationType === 'SELLER_LIVENESS') {
      await query(
        `UPDATE escrows SET state = 'SCANNING' WHERE id = $1`,
        [escrowId]
      );
    } else if (verificationType === 'BUYER_UNBOXING') {
      await query(
        `UPDATE escrows SET state = 'COMPLETED' WHERE id = $1`,
        [escrowId]
      );
    }

    res.json({ 
      verificationId: result.rows[0].id,
      videoPath,
      confidenceScore: 0.95 // MVP: mock confidence
    });
  } catch (error) {
    console.error('Upload verification error:', error);
    res.status(500).json({ error: 'Failed to upload verification' });
  }
});

// List user's escrows
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const result = await query(
      `SELECT * FROM escrows WHERE buyer_id = $1 OR seller_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('List escrows error:', error);
    res.status(500).json({ error: 'Failed to list escrows' });
  }
});

export default router;
