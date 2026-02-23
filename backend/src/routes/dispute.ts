import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Raise dispute
router.post('/:escrowId/raise', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const { escrowId } = req.params;
    const { reason, evidenceJson, disputeType } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const result = await query(
      `INSERT INTO disputes (escrow_id, raised_by_id, reason, evidence_json, dispute_type, status, tier)
       VALUES ($1, $2, $3, $4, $5, 'OPEN', 1)
       RETURNING id`,
      [escrowId, userId, reason, JSON.stringify(evidenceJson || {}), disputeType || 'ITEM_MISMATCH']
    );

    await query(
      `UPDATE escrows SET state = 'DISPUTED' WHERE id = $1`,
      [escrowId]
    );

    res.status(201).json({ disputeId: result.rows[0].id });
  } catch (error) {
    console.error('Raise dispute error:', error);
    res.status(500).json({ error: 'Failed to raise dispute' });
  }
});

// Get dispute
router.get('/:disputeId', async (req: Request, res: Response) => {
  try {
    const { disputeId } = req.params;

    const result = await query(
      `SELECT * FROM disputes WHERE id = $1`,
      [disputeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get dispute error:', error);
    res.status(500).json({ error: 'Failed to get dispute' });
  }
});

// Resolve dispute (manual for MVP)
router.post('/:disputeId/resolve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const { disputeId } = req.params;
    const { resolutionText, resolvedFor } = req.body;

    if (!resolvedFor) {
      return res.status(400).json({ error: 'Resolution required (BUYER or SELLER)' });
    }

    const result = await query(
      `UPDATE disputes SET status = 'RESOLVED', resolution_text = $1, resolved_for = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING escrow_id`,
      [resolutionText || '', resolvedFor, disputeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const escrowId = result.rows[0].escrow_id;

    // Update escrow state
    await query(
      `UPDATE escrows SET state = 'CLOSED' WHERE id = $1`,
      [escrowId]
    );

    res.json({ status: 'RESOLVED', resolvedFor });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

export default router;
