import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authAPI } from '@/lib/api';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await authAPI.me();
        setUser(res.data);
      } catch (err) {
        if (router.pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
        a { color: #0070f3; text-decoration: none; }
        button { padding: 8px 16px; background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0051cc; }
        input, textarea { padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .card { background: white; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .status { text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; }
        .error { color: red; }
        .success { color: green; }
      `}</style>
      <div className="container">
        <div className="header">
          <h1>🚀 TrustEscrow MVP</h1>
          {user && (
            <div>
              <span>Welcome, {user.username}!</span>
              <button onClick={() => { authAPI.logout(); router.push('/login'); }} style={{ marginLeft: '10px' }}>
                Logout
              </button>
            </div>
          )}
        </div>
        <Component {...pageProps} user={user} />
      </div>
    </div>
  );
}
