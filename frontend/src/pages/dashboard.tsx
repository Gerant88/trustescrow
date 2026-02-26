import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';
import { escrowApi, userApi, authApi } from '../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const { user, setUser, isInitialized } = useAuthStore();
  const [escrows, setEscrows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace('/');
      return;
    }

    Promise.all([
      escrowApi.list(),
      userApi.stats(),
    ])
      .then(([escrowRes, statsRes]) => {
        setEscrows(escrowRes.data as any[]);
        setStats(statsRes.data);
      })
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, [user, router, isInitialized]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      router.push('/');
    } catch {
      router.push('/');
    }
  };

  if (!isInitialized || (!user && !error)) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }
  if (loading) return <div style={{ padding: '20px' }}>Loading dashboard...</div>;
  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => router.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px' }}>Logout</button>
      </div>
      <p>Welcome, {user!.name}!</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h3>Buyer Score</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{user!.buyer_score}</p>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h3>Seller Score</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{user!.seller_score}</p>
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
