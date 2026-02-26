import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../store/authStore';
import { escrowApi, disputeApi } from '../../lib/api';

export default function EscrowDetail() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const { id: escrowId } = router.query;
  const [escrow, setEscrow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeType, setDisputeType] = useState('ITEM_MISMATCH');

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!escrowId) return;

    escrowApi.get(String(escrowId))
      .then((res) => setEscrow(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.error || 'Failed to load escrow';
        setLoadError(msg);
      })
      .finally(() => setLoading(false));
  }, [escrowId, user, isInitialized, router]);

  const handleAcknowledge = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await escrowApi.acknowledge(String(escrowId));
      setEscrow((prev: any) => ({ ...prev, state: 'ACKNOWLEDGED', seller_id: user!.id }));
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed to acknowledge escrow');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadVerification = async (verificationType: 'SELLER_LIVENESS' | 'BUYER_UNBOXING') => {
    if (!videoFile) {
      setActionError('Please select a video file first');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await escrowApi.uploadVerification(String(escrowId), {
        verificationType,
        videoData: videoFile.name,
      });
      const nextState = verificationType === 'SELLER_LIVENESS' ? 'SCANNING' : 'COMPLETED';
      setEscrow((prev: any) => ({ ...prev, state: nextState }));
      setVideoFile(null);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed to upload verification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim()) {
      setActionError('Please enter a reason for the dispute');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await disputeApi.raise(String(escrowId), {
        reason: disputeReason,
        disputeType,
      });
      setEscrow((prev: any) => ({ ...prev, state: 'DISPUTED' }));
      setShowDisputeForm(false);
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed to raise dispute');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isInitialized) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!user) return null;
  if (loading) return <div style={{ padding: '20px' }}>Loading escrow...</div>;
  if (loadError) {
    return (
      <div style={{ padding: '20px' }}>
        <p style={{ color: 'red' }}>{loadError}</p>
        <button onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }
  if (!escrow) return <div style={{ padding: '20px' }}>Escrow not found</div>;

  const isBuyer = user.id === escrow.buyer_id;
  const isSeller = user.id === escrow.seller_id;
  const isParty = isBuyer || isSeller;
  const canRaiseDispute = isParty
    && !['COMPLETED', 'CLOSED', 'DISPUTED'].includes(escrow.state);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => router.back()} style={{ marginBottom: '20px' }}>← Back</button>

      <h1>{escrow.item_name}</h1>
      <p><strong>State:</strong> {escrow.state}</p>
      <p><strong>Item Value:</strong> ₱{Number(escrow.item_value).toLocaleString()}</p>
      <p><strong>Buyer Deposit:</strong> ₱{Number(escrow.buyer_deposit).toLocaleString()}</p>
      <p><strong>Platform Fee:</strong> ₱{Number(escrow.platform_fee).toLocaleString()}</p>
      <p><strong>Seller Receives:</strong> ₱{Number(escrow.seller_receives).toLocaleString()}</p>
      {escrow.buyer_name && <p><strong>Buyer:</strong> {escrow.buyer_name}</p>}
      {escrow.seller_name && <p><strong>Seller:</strong> {escrow.seller_name}</p>}

      {actionError && (
        <p style={{ color: 'red', margin: '10px 0' }}>{actionError}</p>
      )}

      <hr style={{ margin: '30px 0' }} />

      {/* CREATED — awaiting seller */}
      {escrow.state === 'CREATED' && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px' }}>
          <h3>Awaiting Seller Acknowledgement</h3>
          <p>Share this link with the seller so they can acknowledge the escrow.</p>
          <p><small>Escrow link: <strong>{window.location.href}</strong></small></p>
          {!isBuyer && (
            <button
              onClick={handleAcknowledge}
              disabled={actionLoading}
              style={{ padding: '10px', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
            >
              {actionLoading ? 'Acknowledging...' : 'Acknowledge as Seller'}
            </button>
          )}
          {isBuyer && <p><em>Waiting for seller to acknowledge.</em></p>}
        </div>
      )}

      {/* ACKNOWLEDGED — seller uploads liveness */}
      {escrow.state === 'ACKNOWLEDGED' && (
        <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px' }}>
          <h3>Ready for Seller Liveness Scan</h3>
          <p>Seller must record and upload an item liveness scan.</p>
          {isSeller && (
            <div>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                style={{ marginBottom: '8px', display: 'block' }}
              />
              <button
                onClick={() => handleUploadVerification('SELLER_LIVENESS')}
                disabled={actionLoading || !videoFile}
                style={{ padding: '10px', cursor: (actionLoading || !videoFile) ? 'not-allowed' : 'pointer' }}
              >
                {actionLoading ? 'Uploading...' : 'Upload Liveness Video'}
              </button>
            </div>
          )}
          {isBuyer && <p><em>Waiting for seller to upload liveness scan.</em></p>}
        </div>
      )}

      {/* SCANNING — buyer uploads unboxing */}
      {escrow.state === 'SCANNING' && (
        <div style={{ backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px' }}>
          <h3>Ready for Buyer Unboxing</h3>
          <p>Seller has completed liveness scan. Buyer must verify on receipt.</p>
          {isBuyer && (
            <div>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                style={{ marginBottom: '8px', display: 'block' }}
              />
              <button
                onClick={() => handleUploadVerification('BUYER_UNBOXING')}
                disabled={actionLoading || !videoFile}
                style={{ padding: '10px', cursor: (actionLoading || !videoFile) ? 'not-allowed' : 'pointer' }}
              >
                {actionLoading ? 'Uploading...' : 'Upload Unboxing Video'}
              </button>
            </div>
          )}
          {isSeller && <p><em>Waiting for buyer to upload unboxing verification.</em></p>}
        </div>
      )}

      {escrow.state === 'COMPLETED' && (
        <div style={{ backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px' }}>
          <h3>Transaction Completed</h3>
          <p>Both parties' honesty scores have been updated.</p>
        </div>
      )}

      {escrow.state === 'DISPUTED' && (
        <div style={{ backgroundColor: '#f8d7da', padding: '15px', borderRadius: '5px' }}>
          <h3>Dispute In Progress</h3>
          <p>Platform review required. A determination will be made.</p>
        </div>
      )}

      {escrow.state === 'CLOSED' && (
        <div style={{ backgroundColor: '#e2e3e5', padding: '15px', borderRadius: '5px' }}>
          <h3>Escrow Closed</h3>
          <p>This dispute has been resolved and the escrow is now closed.</p>
        </div>
      )}

      {/* Raise dispute — available to parties in non-terminal states */}
      {canRaiseDispute && !showDisputeForm && (
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => setShowDisputeForm(true)}
            style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Raise a Dispute
          </button>
        </div>
      )}

      {showDisputeForm && (
        <div style={{ marginTop: '20px', border: '1px solid #dc3545', padding: '15px', borderRadius: '5px' }}>
          <h3>Raise Dispute</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Dispute Type
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              >
                <option value="ITEM_MISMATCH">Item Mismatch</option>
                <option value="NOT_RECEIVED">Item Not Received</option>
                <option value="DAMAGED">Item Damaged</option>
                <option value="FRAUD">Fraud</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Reason *
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
                maxLength={2000}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                placeholder="Describe the issue in detail..."
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleRaiseDispute}
              disabled={actionLoading}
              style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
            >
              {actionLoading ? 'Submitting...' : 'Submit Dispute'}
            </button>
            <button
              onClick={() => { setShowDisputeForm(false); setActionError(''); }}
              disabled={actionLoading}
              style={{ padding: '10px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
