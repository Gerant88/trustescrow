import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../lib/api';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const { user, setUser, isInitialized } = useAuthStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, name);
      setUser(res.data);
      router.push('/dashboard');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Still checking session — don't flash the login form
  if (!isInitialized) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (user) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Welcome, {user.name}!</h1>
        <button onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h1>🏦 TrustEscrow</h1>
      <p>Verification-first escrow for peer-to-peer commerce</p>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        {error && (
          <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
