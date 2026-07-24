import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, ChevronRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState(localStorage.getItem('savedPassword') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid password. Please try again.');
      }

      // Always remember the password automatically
      localStorage.setItem('savedPassword', password.trim());

      onLogin({
        folderId: data.folderId,
        albumId: data.albumId,
        albums: data.albums,
        isR2: data.isR2
      });
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-cream)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>


      {/* Floating Glass Login Card Container */}
      <div className="glass-panel" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '40px 36px 36px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        margin: '0 auto'
      }}>

        {/* Header Branding */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '400',
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-primary)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            lineHeight: '1.1'
          }}>
            Golden Moment
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--color-text-muted)',
            fontWeight: '400',
            lineHeight: '1.5'
          }}>
            Enter your order ID to view your project<br/>(can be found on your agreements or ask the editor)
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Underline Input Field */}
          <div style={{
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRadius: '9999px',
            border: isFocused ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
            boxShadow: isFocused ? '0 0 0 4px rgba(139, 21, 26, 0.1)' : 'none',
            transition: 'all 0.25s ease',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Lock size={19} style={{
              position: 'absolute',
              left: '20px',
              color: isFocused ? 'var(--color-primary)' : 'var(--color-text-muted)',
              transition: 'color 0.2s ease'
            }} />
            
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="Your order ID"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={{
                width: '100%',
                padding: '16px 45px 16px 52px',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '1rem',
                fontWeight: '500',
                color: 'var(--color-text-main)',
                borderRadius: '9999px'
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ad1457',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error Message */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '-4px' }}>
            {error && (
              <span style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: '600' }}>
                {error}
              </span>
            )}
          </div>

          {/* Deep Crimson Heart Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Unlocking Album...</span>
              </>
            ) : (
              <>
                <span>View Project</span>
                <ChevronRight size={19} strokeWidth={3} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

