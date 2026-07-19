import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ChevronRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password.trim()) {
      setError('Please enter your Album Password');
      return;
    }

    setLoading(true);
    try {
      // Typically an env variable to backend URL, using relative here assuming proxy or same origin
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: password.trim() })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin({
        folderId: data.folderId,
        albumId: data.albumId,
        albums: data.albums
      });
      
      if (data.albums && data.albums.length === 1) {
        navigate(`/viewer/${encodeURIComponent(data.albums[0].file)}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '40px 30px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '10px', color: 'var(--color-gold)' }}>GoldenMoment</h1>
        <p style={{ marginBottom: '30px', color: 'var(--color-grey-dark)', fontSize: '0.9rem' }}>
          Enter your Album Password to view your design
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-grey-dark)' }} />
            <input 
              type="password" 
              className="input-elegant" 
              placeholder="e.g. GM001" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '45px' }}
            />
          </div>

          {error && <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

          <button type="submit" className="btn-gold" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            {loading ? 'Authenticating...' : 'View Album'}
            {!loading && <ChevronRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
