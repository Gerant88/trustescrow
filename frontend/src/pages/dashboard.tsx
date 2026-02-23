import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';
import { escrowApi, userApi } from '../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [escrows, setEscrows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    Promise.all([
      escrowApi.list(),
      userApi.stats(),
    ])
      .then(([escrowRes, statsRes]) => {
        setEscrows(escrowRes.data);
        setStats(statsRes.data);
      })
      .catch((error) => {
        console.error('Failed to load dashboard:', error);
        alert('Failed to load dashboard');
      })
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user) return <div>Loading...</div>;
  if (loading) return <div style={{ padding: '20px' }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}!</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h3>Buyer Score</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{user.buyer_score}</p>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h3>Seller Score</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{user.seller_score}</p>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Your Escrows</h2>
        <button onClick={() => router.push('/escrow/create')} style={{ padding: '10px', marginBottom: '15px' }}>
          + Create New Escrow
        </button>

        {escrows.length === 0 ? (
          <p>No escrows yet. Create one to get started!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: '10px' }}>Item</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Value</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>State</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {escrows.map((escrow) => (
                <tr key={escrow.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{escrow.item_name}</td>
                  <td style={{ padding: '10px' }}>₱{escrow.item_value}</td>
                  <td style={{ padding: '10px' }}>{escrow.state}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => router.push(`/escrow/${escrow.id}`)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
