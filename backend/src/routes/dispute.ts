import { Router, Request, Response } from 'express';
import { query, pool } from '../db';

const router = Router();

const VALID_DISPUTE_TYPES = ['ITEM_MISMATCH', 'NOT_RECEIVED', 'DAMAGED', 'FRAUD', 'OTHER'];
const VALID_RESOLVED_FOR = ['BUYER', 'SELLER'];

// Raise dispute — only buyer or seller of the escrow may do so
router.post('/:escrowId/raise', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const { escrowId } = req.params;
    const { reason, evidenceJson, disputeType } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    if (reason.length > 2000) {
      return res.status(400).json({ error: 'Reason must be under 2,000 characters' });
    }
    if (disputeType && !VALID_DISPUTE_TYPES.includes(disputeType)) {
      return res.status(400).json({ error: `disputeType must be one of: ${VALID_DISPUTE_TYPES.join(', ')}` });
    }

    // Verify the requester is a party to the escrow
    const escrowCheck = await query(
      `SELECT buyer_id, seller_id, state FROM escrows WHERE id = $1`,
      [escrowId]
    );

    if (escrowCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const escrow = escrowCheck.rows[0];

    if (escrow.buyer_id !== userId && escrow.seller_id !== userId) {
      return res.status(403).json({ error: 'Only parties to this escrow may raise a dispute' });
    }
    if (escrow.state === 'COMPLETED' || escrow.state === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot raise a dispute on a completed or closed escrow' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO disputes (escrow_id, raised_by_id, reason, evidence_json, dispute_type, status, tier)
         VALUES ($1, $2, $3, $4, $5, 'OPEN', 1)
         RETURNING id`,
        [
          escrowId, userId, reason.trim(),
          JSON.stringify(evidenceJson || {}),
          disputeType || 'ITEM_MISMATCH',
        ]
      );

      await client.query(
        `UPDATE escrows SET state = 'DISPUTED', updated_at = NOW() WHERE id = $1`,
        [escrowId]
      );

      await client.query(
        `INSERT INTO transaction_log (escrow_id, action, actor_id) VALUES ($1, $2, $3)`,
        [escrowId, 'DISPUTE_RAISED', userId]
      );

      await client.query('COMMIT');

      res.status(201).json({ disputeId: result.rows[0].id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Raise dispute error:', error);
    res.status(500).json({ error: 'Failed to raise dispute' });
  }
});

// Get dispute — only parties to the underlying escrow may view
router.get('/:disputeId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const { disputeId } = req.params;

    const result = await query(
      `SELECT d.*, e.buyer_id, e.seller_id
       FROM disputes d
       JOIN escrows e ON e.id = d.escrow_id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = result.rows[0];

    if (dispute.buyer_id !== userId && dispute.seller_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(dispute);
  } catch (error) {
    console.error('Get dispute error:', error);
    res.status(500).json({ error: 'Failed to get dispute' });
  }
});

// List disputes for an escrow — only parties may view
router.get('/escrow/:escrowId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const { escrowId } = req.params;

    const escrowCheck = await query(
      `SELECT buyer_id, seller_id FROM escrows WHERE id = $1`,
      [escrowId]
    );

    if (escrowCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const escrow = escrowCheck.rows[0];
    if (escrow.buyer_id !== userId && escrow.seller_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT * FROM disputes WHERE escrow_id = $1 ORDER BY created_at DESC`,
      [escrowId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('List disputes error:', error);
    res.status(500).json({ error: 'Failed to list disputes' });
  }
});

// Resolve dispute — only users with role 'admin' may resolve
router.post('/:disputeId/resolve', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    // Check admin role
    const userCheck = await query(
      `SELECT role FROM users WHERE id = $1`,
      [userId]
    );
    if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only platform admins may resolve disputes' });
    }

    const { disputeId } = req.params;
    const { resolutionText, resolvedFor } = req.body;

    if (!resolvedFor || !VALID_RESOLVED_FOR.includes(resolvedFor)) {
      return res.status(400).json({ error: `resolvedFor must be one of: ${VALID_RESOLVED_FOR.join(', ')}` });
    }
    if (resolutionText && typeof resolutionText !== 'string') {
      return res.status(400).json({ error: 'resolutionText must be a string' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE disputes
         SET status = 'RESOLVED', resolution_text = $1, resolved_for = $2, updated_at = NOW()
         WHERE id = $3 AND status = 'OPEN'
         RETURNING escrow_id`,
        [resolutionText || '', resolvedFor, disputeId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Dispute not found or already resolved' });
      }

      const escrowId = result.rows[0].escrow_id;

      await client.query(
        `UPDATE escrows SET state = 'CLOSED', updated_at = NOW() WHERE id = $1`,
        [escrowId]
      );

      await client.query(
        `INSERT INTO transaction_log (escrow_id, action, actor_id, metadata_json)
         VALUES ($1, $2, $3, $4)`,
        [escrowId, 'DISPUTE_RESOLVED', userId, JSON.stringify({ resolvedFor })]
      );

      await client.query('COMMIT');

      res.json({ status: 'RESOLVED', resolvedFor });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

export default router;
