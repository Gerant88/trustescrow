import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { escrowAPI, disputeAPI } from '@/lib/api';

export default function EscrowDetail({ user }: any) {
  const router = useRouter();
  const { id } = router.query;
  const [escrow, setEscrow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchEscrow();
  }, [id]);

  const fetchEscrow = async () => {
    try {
      const res = await escrowAPI.get(id as string);
      setEscrow(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    setActionLoading(true);
    try {
      const res = await escrowAPI.acknowledge(id as string);
      setEscrow(res.data);
      setSuccess('Escrow acknowledged!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to acknowledge');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScan = async () => {
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }
    setActionLoading(true);
    try {
      const res = await escrowAPI.scan(id as string, videoFile);
      setEscrow(res.data);
      setVideoFile(null);
      setSuccess('Item scanned successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload scan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInTransit = async () => {
    // Mock: just update to IN_TRANSIT (in real app, would need courier integration)
    setEscrow({ ...escrow, state: 'IN_TRANSIT' });
    setSuccess('Item marked as in transit');
  };

  const handleUnbox = async () => {
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }
    setActionLoading(true);
    try {
      const res = await escrowAPI.unbox(id as string, videoFile);
      setEscrow(res.data);
      setVideoFile(null);
      setSuccess('Unboxing verified! Payment released to seller.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload unboxing');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async () => {
    const reason = prompt('Reason for dispute:');
    if (!reason) return;

    setActionLoading(true);
    try {
      await disputeAPI.create(id as string, reason, videoFile || undefined);
      setSuccess('Dispute raised successfully');
      setEscrow({ ...escrow, state: 'DISPUTED' });
      setVideoFile(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to raise dispute');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!escrow) return <div className="error">Escrow not found</div>;

  const isBuyer = user.id === escrow.buyer_id;
  const isSeller = user.id === escrow.seller_id;

  return (
    <div className="card">
      <h2>Escrow: {escrow.item_description}</h2>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <p><strong>Item Price:</strong> PHP {parseFloat(escrow.item_price).toFixed(2)}</p>
            <p><strong>Platform Fee:</strong> PHP {parseFloat(escrow.platform_fee).toFixed(2)}</p>
            <p><strong>Buyer Deposit:</strong> PHP {parseFloat(escrow.buyer_deposit).toFixed(2)}</p>
          </div>
          <div>
            <p><strong>State:</strong> <span style={{ background: '#ddd', padding: '4px 8px', borderRadius: '3px' }}>{escrow.state}</span></p>
            <p><strong>Your Role:</strong> {isBuyer ? '👤 Buyer' : '🏪 Seller'}</p>
            <p><strong>Created:</strong> {new Date(escrow.created_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <div style={{ marginBottom: '20px' }}>
        <h3>Transaction Flow</h3>

        {escrow.state === 'CREATED' && isSeller && (
          <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '4px' }}>
            <p>Seller needs to acknowledge this transaction</p>
            <button onClick={handleAcknowledge} disabled={actionLoading}>
              {actionLoading ? 'Acknowledging...' : 'Acknowledge Escrow'}
            </button>
          </div>
        )}

        {escrow.state === 'ACKNOWLEDGED' && isSeller && (
          <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '4px' }}>
            <p>Upload a liveness video of the item you're selling</p>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              disabled={actionLoading}
            />
            <button onClick={handleScan} disabled={actionLoading || !videoFile}>
              {actionLoading ? 'Uploading...' : 'Upload Item Scan'}
            </button>
            {escrow.seller_liveness_confidence && (
              <p style={{ fontSize: '0.9rem', color: '#666' }}>
                Scan confidence: {escrow.seller_liveness_confidence}% ✓
              </p>
            )}
          </div>
        )}

        {escrow.state === 'SCANNED' && isBuyer && (
          <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '4px' }}>
            <p>Item has been verified by seller. Click below when you're ready to receive it.</p>
            <button onClick={handleMarkInTransit} disabled={actionLoading}>
              Mark as In Transit
            </button>
          </div>
        )}

        {escrow.state === 'IN_TRANSIT' && isBuyer && (
          <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '4px' }}>
            <p>Upload a video of yourself unboxing the item</p>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              disabled={actionLoading}
            />
            <button onClick={handleUnbox} disabled={actionLoading || !videoFile}>
              {actionLoading ? 'Uploading...' : 'Upload Unboxing Verification'}
            </button>
          </div>
        )}

        {escrow.state === 'COMPLETED' && (
          <div style={{ padding: '15px', background: '#c8e6c9', borderRadius: '4px' }}>
            <p>✅ Transaction completed! Payment released to seller.</p>
            {escrow.buyer_unboxing_confidence && (
              <p style={{ fontSize: '0.9rem' }}>
                Verification confidence: {escrow.buyer_unboxing_confidence}%
              </p>
            )}
          </div>
        )}

        {escrow.state === 'DISPUTED' && (
          <div style={{ padding: '15px', background: '#ffebee', borderRadius: '4px' }}>
            <p>⚠️ This escrow is in dispute. Manual review required.</p>
          </div>
        )}
      </div>

      {(escrow.state === 'IN_TRANSIT' || escrow.state === 'SCANNED') && (
        <div>
          <hr style={{ margin: '20px 0' }} />
          <h3>Actions</h3>
          <button onClick={handleDispute} style={{ background: '#d32f2f' }}>
            Raise Dispute
          </button>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.85rem' }}>
        <h4>Debug Info</h4>
        <pre>{JSON.stringify({ state: escrow.state, seller_scan: !!escrow.seller_liveness_video_url, buyer_unbox: !!escrow.buyer_unboxing_video_url }, null, 2)}</pre>
      </div>
    </div>
  );
}
