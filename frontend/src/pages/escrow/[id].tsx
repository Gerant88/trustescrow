import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../store/authStore';
import { escrowApi } from '../../lib/api';

export default function EscrowDetail() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { id: escrowId } = router.query;
  const [escrow, setEscrow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!escrowId) return;

    escrowApi.get(String(escrowId))
      .then((res) => setEscrow(res.data))
      .catch((error) => console.error('Failed to load escrow:', error))
      .finally(() => setLoading(false));
  }, [escrowId]);

  const handleAcknowledge = async () => {
    try {
      await escrowApi.acknowledge(String(escrowId));
      alert('Escrow acknowledged!');
      setEscrow({ ...escrow, state: 'ACKNOWLEDGED' });
    } catch (error) {
      console.error('Failed to acknowledge:', error);
      alert('Failed to acknowledge escrow');
    }
  };

  const handleUploadVerification = async (verificationType: string) => {
    if (!videoFile) {
      alert('Please select a video file');
      return;
    }

    try {
      // For MVP: just send file name, in production would be proper file upload
      await escrowApi.uploadVerification(String(escrowId), {
        verificationType,
        videoData: videoFile.name,
      });
      alert(`${verificationType} verification uploaded!`);
    } catch (error) {
      console.error('Failed to upload verification:', error);
      alert('Failed to upload verification');
    }
  };

  if (!user) return <div>Please log in first</div>;
  if (loading) return <div style={{ padding: '20px' }}>Loading escrow...</div>;
  if (!escrow) return <div style={{ padding: '20px' }}>Escrow not found</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => router.back()} style={{ marginBottom: '20px' }}>← Back</button>

      <h1>{escrow.item_name}</h1>
      <p><strong>State:</strong> {escrow.state}</p>
      <p><strong>Item Value:</strong> ₱{escrow.item_value}</p>
      <p><strong>Buyer Deposit:</strong> ₱{escrow.buyer_deposit}</p>
      <p><strong>Platform Fee:</strong> ₱{escrow.platform_fee}</p>
      <p><strong>Seller Receives:</strong> ₱{escrow.seller_receives}</p>

      <hr style={{ margin: '30px 0' }} />

      {/* Actions based on state */}
      {escrow.state === 'CREATED' && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px' }}>
          <h3>Awaiting Seller Acknowledgement</h3>
          <p>Share this escrow link with the seller, or they can acknowledge from here if logged in.</p>
          {user.id !== escrow.buyer_id && (
            <button onClick={handleAcknowledge} style={{ padding: '10px' }}>
              Acknowledge as Seller
            </button>
          )}
        </div>
      )}

      {escrow.state === 'ACKNOWLEDGED' && (
        <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px' }}>
          <h3>Ready for Seller Liveness Scan</h3>
          <p>Seller must perform an item liveness scan.</p>
          {user.id === escrow.seller_id && (
            <div>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={() => handleUploadVerification('SELLER_LIVENESS')}
                style={{ padding: '10px', marginLeft: '10px' }}
              >
                Upload Liveness Video
              </button>
            </div>
          )}
        </div>
      )}

      {escrow.state === 'SCANNED' && (
        <div style={{ backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px' }}>
          <h3>Ready for Buyer Unboxing</h3>
          <p>Seller has scanned the item. Buyer must verify on receipt.</p>
          {user.id === escrow.buyer_id && (
            <div>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={() => handleUploadVerification('BUYER_UNBOXING')}
                style={{ padding: '10px', marginLeft: '10px' }}
              >
                Upload Unboxing Video
              </button>
            </div>
          )}
        </div>
      )}

      {escrow.state === 'COMPLETED' && (
        <div style={{ backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px' }}>
          <h3>✅ Transaction Completed</h3>
          <p>Payment released to seller. Both parties' honesty scores updated.</p>
        </div>
      )}

      {escrow.state === 'DISPUTED' && (
        <div style={{ backgroundColor: '#f8d7da', padding: '15px', borderRadius: '5px' }}>
          <h3>⚠️ Dispute In Progress</h3>
          <p>Manual review required. Platform will make a determination.</p>
        </div>
      )}
    </div>
  );
}
