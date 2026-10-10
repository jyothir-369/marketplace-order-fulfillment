import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AddressPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/customer/addresses').then(r => r.ok ? r.json() : Promise.reject()).then(d => setAddresses(d.addresses || [])).catch(() => setError('Failed to load addresses')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading addresses...</div>;
  if (error) return <div style={{color:'red'}}>{error}</div>;
  return (
    <div>
      <h1>My Addresses</h1>
      {addresses.length === 0 ? <p>No addresses saved.</p> : addresses.map(a => <div key={a.id}>{a.label}: {a.street}, {a.city}</div>)}
    </div>
  );
}
