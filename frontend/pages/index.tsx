import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { escrowAPI } from '@/lib/api';

export default function Home({ user }: any) {
  const [escrows, setEscrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchEscrows = async () => {
      try {
        const res = await escrowAPI.list();
        setEscrows(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchEscrows();
  }, [user]);

  if (!user) return <div>Redirecting to login...</div>;
  if (loading) return <div>Loading escrows...</div>;

  return (
    <div>
      <h2>Your Transactions</h2>
      <Link href="/escrow/create">
        <button>+ Create New Escrow (Buyer)</button>
      </Link>
      <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
        As a buyer, click "Create New Escrow" to initiate a transaction.
      </p>

      {escrows.length === 0 ? (
        <p>No escrows yet.</p>
      ) : (
        <div>
          {escrows.map((e: any) => (
            <div key={e.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h3>{e.item_description}</h3>
                  <p>PHP {parseFloat(e.item_price).toFixed(2)}</p>
                  <p style={{ fontSize: '0.9rem', color: '#666' }}>State: <strong>{e.state}</strong></p>
                  {user.id === e.buyer_id && <p style={{ fontSize: '0.8rem' }}>Your role: Buyer</p>}
                  {user.id === e.seller_id && <p style={{ fontSize: '0.8rem' }}>Your role: Seller</p>}
                </div>
                <Link href={`/escrow/${e.id}`}>
                  <button>View Details</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
