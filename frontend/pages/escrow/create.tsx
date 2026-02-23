import { useState } from 'react';
import { useRouter } from 'next/router';
import { escrowAPI } from '@/lib/api';

export default function CreateEscrow() {
  const [sellerId, setSellerId] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [deliveryWindow, setDeliveryWindow] = useState('1-3 days');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await escrowAPI.create({
        sellerId,
        itemDescription,
        itemPrice: parseFloat(itemPrice),
        expectedDeliveryWindow: deliveryWindow,
      });
      router.push(`/escrow/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create escrow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Create New Escrow</h2>
      <form onSubmit={handleCreate}>
        <div style={{ marginBottom: '15px' }}>
          <label>Seller ID (user to trade with)</label>
          <input
            type="text"
            placeholder="e.g., seller_username"
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            style={{ width: '100%' }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Item Description</label>
          <textarea
            placeholder="Describe what you're buying..."
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            style={{ width: '100%', minHeight: '100px' }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Item Price (PHP)</label>
          <input
            type="number"
            placeholder="e.g., 5000"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            style={{ width: '100%' }}
            disabled={loading}
          />
          <small style={{ color: '#666' }}>You will lock PHP {(parseFloat(itemPrice) * 2 || 0).toFixed(2)} as deposit (2x price)</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Expected Delivery Window</label>
          <select
            value={deliveryWindow}
            onChange={(e) => setDeliveryWindow(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            disabled={loading}
          >
            <option>1-3 days</option>
            <option>3-7 days</option>
            <option>1-2 weeks</option>
          </select>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Escrow'}
        </button>
      </form>
    </div>
  );
}
