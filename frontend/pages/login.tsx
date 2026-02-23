import { useState } from 'react';
import { useRouter } from 'next/router';
import { authAPI } from '@/lib/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authAPI.login(username);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="status">
      <h2>Login to TrustEscrow</h2>
      <p>MVP uses fake login (no password required)</p>
      <form onSubmit={handleLogin} style={{ maxWidth: '300px', margin: '20px auto' }}>
        <input
          type="text"
          placeholder="Username (min 3 chars)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: '100%', marginBottom: '10px' }}
        />
        <button type="submit" style={{ width: '100%' }}>Login</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
