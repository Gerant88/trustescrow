import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../store/authStore';
import { escrowApi } from '../../lib/api';

export default function CreateEscrow() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [formData, setFormData] = useState({
    itemName: '',
    itemValue: '',
    itemDescription: '',
    platformSource: 'facebook-marketplace',
    listingUrl: '',
    expectedDeliveryWindow: '3-7 days',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/');
    }
  }, [isInitialized, user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const itemValue = parseFloat(formData.itemValue);
    if (isNaN(itemValue) || itemValue < 100 || itemValue > 1_000_000) {
      setError('Item value must be between ₱100 and ₱1,000,000');
      return;
    }
    if (formData.itemName.trim().length === 0) {
      setError('Item name is required');
      return;
    }

    setLoading(true);
    try {
      const res = await escrowApi.create({
        ...formData,
        itemValue,
      });
      setShareLink(res.data.shareLink);
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create escrow';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!user) return null;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={() => router.back()} style={{ marginBottom: '20px' }}>
        ← Back
      </button>

      <h1>Create New Escrow</h1>
      <p>You're the buyer. Fill in the item details below.</p>

      {shareLink && (
        <div style={{ backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px', marginBottom: '15px' }}>
          <p><strong>Escrow created!</strong> Share this link with your seller:</p>
          <p><a href={shareLink}>{shareLink}</a></p>
          <p><small>Redirecting to dashboard in 3 seconds...</small></p>
        </div>
      )}

      {error && (
        <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>
            Item Name *
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Item Value (PHP) *
            <input
              type="number"
              name="itemValue"
              value={formData.itemValue}
              onChange={handleChange}
              required
              min="100"
              max="1000000"
              step="100"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
          <small>Must be between ₱100 and ₱1,000,000. You'll deposit 2x this amount into escrow.</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Description
            <textarea
              name="itemDescription"
              value={formData.itemDescription}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '100px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Platform Source
            <select
              name="platformSource"
              value={formData.platformSource}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="facebook-marketplace">Facebook Marketplace</option>
              <option value="olx">OLX</option>
              <option value="shopee">Shopee</option>
              <option value="lazada">Lazada</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Listing URL
            <input
              type="url"
              name="listingUrl"
              value={formData.listingUrl}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            Expected Delivery Window
            <select
              name="expectedDeliveryWindow"
              value={formData.expectedDeliveryWindow}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="1-3 days">1-3 days</option>
              <option value="3-7 days">3-7 days</option>
              <option value="1-2 weeks">1-2 weeks</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Creating...' : 'Create Escrow'}
        </button>
      </form>
    </div>
  );
}
