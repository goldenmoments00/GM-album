import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, ChevronRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState(localStorage.getItem('savedPassword') || '');
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
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

      if (rememberMe) {
        localStorage.setItem('savedPassword', password.trim());
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('savedPassword');
        localStorage.removeItem('rememberMe');
      }

      onLogin({
        folderId: data.folderId,
        albumId: data.albumId,
        albums: data.albums
      });
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #f7b9c9 0%, #eb9fb4 50%, #e08aa1 100%)',
      padding: '20px',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatBalloon {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes floatCloud {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(10px); }
        }
        @keyframes pulseHeart {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes popCard {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Pure SVG Vector Paper-Cut Illustration Background */}
      <svg 
        viewBox="0 0 1440 900" 
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        <defs>
          <filter id="paperShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#801c38" floodOpacity="0.22" />
          </filter>
          <filter id="cloudPaperShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#6d122a" floodOpacity="0.26" />
          </filter>
          <filter id="balloonShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="4" dy="12" stdDeviation="8" floodColor="#59001b" floodOpacity="0.25" />
          </filter>
          <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f3e6ec" />
          </linearGradient>
        </defs>

        {/* Paper Cloud Symbol / Reusable Component */}
        {/* Paper Clouds matching user exact screenshot */}
        <g filter="url(#cloudPaperShadow)" style={{ animation: 'floatCloud 9s ease-in-out infinite' }}>
          {/* Cloud 1 - Top Left */}
          <g transform="translate(240, 180) scale(1.3)">
            <path 
              fill="url(#cloudGrad)" 
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1"
              d="M -90 0 C -105 0 -105 -18 -90 -22 C -88 -35 -65 -45 -50 -35 C -42 -54 -18 -68 8 -62 C 28 -72 55 -58 60 -42 C 76 -46 94 -32 88 -18 C 104 -14 104 0 88 0 Z" 
            />
          </g>

          {/* Cloud 2 - Middle Left */}
          <g transform="translate(90, 320) scale(0.95)" opacity="0.92">
            <path 
              fill="url(#cloudGrad)" 
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1"
              d="M -90 0 C -105 0 -105 -18 -90 -22 C -88 -35 -65 -45 -50 -35 C -42 -54 -18 -68 8 -62 C 28 -72 55 -58 60 -42 C 76 -46 94 -32 88 -18 C 104 -14 104 0 88 0 Z" 
            />
          </g>

          {/* Cloud 3 - Top Center */}
          <g transform="translate(680, 140) scale(1.4)">
            <path 
              fill="url(#cloudGrad)" 
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1"
              d="M -90 0 C -105 0 -105 -18 -90 -22 C -88 -35 -65 -45 -50 -35 C -42 -54 -18 -68 8 -62 C 28 -72 55 -58 60 -42 C 76 -46 94 -32 88 -18 C 104 -14 104 0 88 0 Z" 
            />
          </g>

          {/* Cloud 4 - Far Right near balloon */}
          <g transform="translate(1320, 420) scale(1.1)" opacity="0.95">
            <path 
              fill="url(#cloudGrad)" 
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1"
              d="M -90 0 C -105 0 -105 -18 -90 -22 C -88 -35 -65 -45 -50 -35 C -42 -54 -18 -68 8 -62 C 28 -72 55 -58 60 -42 C 76 -46 94 -32 88 -18 C 104 -14 104 0 88 0 Z" 
            />
          </g>
        </g>

        {/* Trailing Small Floating Paper Hearts */}
        <g opacity="0.85">
          <path fill="#b71c1c" d="M680,480 C680,474 675,470 670,470 C665,470 660,474 660,480 C660,490 680,502 680,502 C680,502 700,490 700,480 C700,474 695,470 690,470 C685,470 680,474 680,480 Z" transform="scale(0.8) translate(150, 40)" />
          <path fill="#d32f2f" d="M720,440 C720,436 716,433 712,433 C708,433 704,436 704,440 C704,447 720,456 720,456 C720,456 736,447 736,440 C736,436 732,433 728,433 C724,433 720,436 720,440 Z" transform="scale(0.6) translate(400, 100)" />
          <path fill="#c2185b" d="M760,510 C760,506 756,503 752,503 C748,503 744,506 744,510 C744,517 760,526 760,526 C760,526 776,517 776,510 C776,506 772,503 768,503 C764,503 760,506 760,510 Z" transform="scale(0.7) translate(280, 20)" />
          <path fill="#b71c1c" d="M820,460 C820,456 816,453 812,453 C808,453 804,456 804,460 C804,467 820,476 820,476 C820,476 836,467 836,460 C836,456 832,453 828,453 C824,453 820,456 820,460 Z" transform="scale(0.9) translate(100, 30)" />
          <path fill="#ad1457" d="M900,430 C900,426 896,423 892,423 C888,423 884,426 884,430 C884,437 900,446 900,446 C900,446 916,437 916,430 C916,426 912,423 908,423 C904,423 900,426 900,430 Z" transform="scale(0.65) translate(300, 60)" />
        </g>

        {/* 3D Paper Heart Hot Air Balloon - Centered in Middle */}
        <g filter="url(#balloonShadow)" transform="translate(720, 220) scale(0.95)" style={{ animation: 'floatBalloon 5s ease-in-out infinite' }}>
          {/* Main Heart Balloon Outer Left */}
          <path fill="#8e0000" d="M0,-20 C-60,-90 -120,-30 -120,30 C-120,90 -40,140 0,170 C40,140 120,90 120,30 C120,-30 60,-90 0,-20 Z" />
          {/* Inner 3D Paper Folds */}
          <path fill="#b71c1c" d="M0,-20 C-45,-85 -90,-25 -90,30 C-90,85 -30,135 0,170 C30,135 90,85 90,30 C90,-25 45,-85 0,-20 Z" />
          <path fill="#d32f2f" d="M0,-20 C-30,-80 -60,-20 -60,30 C-60,80 -20,130 0,170 C20,130 60,80 60,30 C60,-20 30,-80 0,-20 Z" />
          <path fill="#e53935" d="M0,-20 C-15,-75 -30,-15 -30,30 C-30,75 -10,125 0,170 C10,125 30,75 30,30 C30,-15 15,-75 0,-20 Z" />
          <path fill="#ff5252" d="M0,-20 C0,-75 0,-15 0,30 C0,75 0,125 0,170 C0,125 0,75 0,30 C0,-15 0,-75 0,-20 Z" />

          {/* Ropes */}
          <line x1="-25" y1="160" x2="-15" y2="210" stroke="#795548" strokeWidth="2" />
          <line x1="25" y1="160" x2="15" y2="210" stroke="#795548" strokeWidth="2" />

          {/* Paper Basket */}
          <rect x="-22" y="210" width="44" height="30" rx="4" fill="#5d4037" />
          <rect x="-25" y="206" width="50" height="7" rx="3" fill="#3e2723" />
        </g>

        {/* Paper-Cut Village Skyline (Back Layer) */}
        <g opacity="0.65" filter="url(#paperShadow)">
          {/* Small Background Houses & Spire */}
          <polygon points="120,840 120,770 155,730 190,770 190,840" fill="#fce4ec" />
          <polygon points="340,840 340,760 385,715 430,760 430,840" fill="#fce4ec" />
          <polygon points="760,840 760,765 805,720 850,765 850,840" fill="#fce4ec" />
          <polygon points="1020,840 1020,750 1065,700 1110,750 1110,840" fill="#fce4ec" />
        </g>

        {/* Paper-Cut Village Skyline (Front Layer - Small & Compact) */}
        <g filter="url(#paperShadow)">
          {/* Pine Tree 1 */}
          <g transform="translate(140, 770) scale(0.65)">
            <path fill="#ffffff" d="M 0 -140 L -45 -20 L -30 -20 L -55 30 L -35 30 L -65 90 L 0 90 Z" />
            <path fill="#f0deee" d="M 0 -140 L 45 -20 L 30 -20 L 55 30 L 35 30 L 65 90 L 0 90 Z" />
          </g>

          {/* House 1 (Left Gable + Circle Window) */}
          <g transform="translate(260, 810) scale(0.85)">
            <rect x="-42" y="-95" width="14" height="40" fill="#ffffff" />
            <rect x="-50" y="-40" width="100" height="90" fill="#ffffff" />
            <polygon points="-60,-40 0,-95 60,-40" fill="#ffffff" />
            <circle cx="0" cy="-60" r="14" fill="#581628" />
            <line x1="-14" y1="-60" x2="14" y2="-60" stroke="#ffffff" strokeWidth="2.5" />
            <line x1="0" y1="-74" x2="0" y2="-46" stroke="#ffffff" strokeWidth="2.5" />
            <rect x="-30" y="-20" width="24" height="24" rx="2" fill="#581628" />
            <line x1="-30" y1="-8" x2="-6" y2="-8" stroke="#ffffff" strokeWidth="2" />
            <line x1="-18" y1="-20" x2="-18" y2="4" stroke="#ffffff" strokeWidth="2" />
          </g>

          {/* Foreground Cottage C1 */}
          <g transform="translate(340, 830) scale(0.8)">
            <rect x="-45" y="-20" width="90" height="70" fill="#ffffff" />
            <polygon points="-55,-20 0,-60 55,-20" fill="#ffffff" />
            <path d="M -18 -30 A 18 18 0 0 1 18 -30 Z" fill="#581628" />
            <line x1="0" y1="-48" x2="0" y2="-30" stroke="#ffffff" strokeWidth="2" />
            <line x1="-12" y1="-42" x2="0" y2="-30" stroke="#ffffff" strokeWidth="2" />
            <line x1="12" y1="-42" x2="0" y2="-30" stroke="#ffffff" strokeWidth="2" />
          </g>

          {/* House 2 (Wide 2-Story 6-Pane Windows) */}
          <g transform="translate(450, 790) scale(0.85)">
            <rect x="36" y="-120" width="16" height="50" fill="#ffffff" />
            <rect x="-55" y="-50" width="110" height="110" fill="#ffffff" />
            <polygon points="-70,-50 0,-115 70,-50" fill="#ffffff" />
            <path d="M -12 -80 A 12 12 0 0 1 12 -80 L 12 -65 L -12 -65 Z" fill="#581628" />
            <line x1="-12" y1="-72" x2="12" y2="-72" stroke="#ffffff" strokeWidth="2" />
            <line x1="0" y1="-92" x2="0" y2="-65" stroke="#ffffff" strokeWidth="2" />
            <rect x="-40" y="-35" width="30" height="42" rx="2" fill="#581628" />
            <line x1="-40" y1="-21" x2="-10" y2="-21" stroke="#ffffff" strokeWidth="2" />
            <line x1="-40" y1="-7" x2="-10" y2="-7" stroke="#ffffff" strokeWidth="2" />
            <line x1="-25" y1="-35" x2="-25" y2="7" stroke="#ffffff" strokeWidth="2" />
            <rect x="10" y="-35" width="30" height="42" rx="2" fill="#581628" />
            <line x1="10" y1="-21" x2="40" y2="-21" stroke="#ffffff" strokeWidth="2" />
            <line x1="10" y1="-7" x2="40" y2="-7" stroke="#ffffff" strokeWidth="2" />
            <line x1="25" y1="-35" x2="25" y2="7" stroke="#ffffff" strokeWidth="2" />
          </g>

          {/* Pine Tree 2 Center */}
          <g transform="translate(580, 760) scale(0.75)">
            <path fill="#ffffff" d="M 0 -140 L -45 -20 L -30 -20 L -55 30 L -35 30 L -65 90 L 0 90 Z" />
            <path fill="#f0deee" d="M 0 -140 L 45 -20 L 30 -20 L 55 30 L 35 30 L 65 90 L 0 90 Z" />
          </g>

          {/* House 3 (Tall Church Spire & Arch Windows) */}
          <g transform="translate(680, 780) scale(0.85)">
            <rect x="-45" y="-120" width="90" height="180" fill="#ffffff" />
            <polygon points="-55,-120 0,-190 55,-120" fill="#ffffff" />
            <line x1="0" y1="-220" x2="0" y2="-190" stroke="#ffffff" strokeWidth="5" />
            <rect x="-20" y="-150" width="40" height="50" rx="20" fill="#581628" />
            <line x1="-20" y1="-125" x2="20" y2="-125" stroke="#ffffff" strokeWidth="2" />
            <line x1="0" y1="-150" x2="0" y2="-100" stroke="#ffffff" strokeWidth="2" />
            <rect x="-25" y="-80" width="20" height="30" rx="2" fill="#581628" />
            <rect x="5" y="-80" width="20" height="30" rx="2" fill="#581628" />
          </g>

          {/* Pine Tree 3 */}
          <g transform="translate(790, 765) scale(0.7)">
            <path fill="#ffffff" d="M 0 -140 L -45 -20 L -30 -20 L -55 30 L -35 30 L -65 90 L 0 90 Z" />
            <path fill="#f0deee" d="M 0 -140 L 45 -20 L 30 -20 L 55 30 L 35 30 L 65 90 L 0 90 Z" />
          </g>

          {/* House 4 (Right Gable + Circle Window) */}
          <g transform="translate(890, 810) scale(0.85)">
            <rect x="-42" y="-95" width="14" height="40" fill="#ffffff" />
            <rect x="-50" y="-40" width="100" height="90" fill="#ffffff" />
            <polygon points="-60,-40 0,-95 60,-40" fill="#ffffff" />
            <circle cx="0" cy="-60" r="14" fill="#581628" />
            <line x1="-14" y1="-60" x2="14" y2="-60" stroke="#ffffff" strokeWidth="2.5" />
            <line x1="0" y1="-74" x2="0" y2="-46" stroke="#ffffff" strokeWidth="2.5" />
            <rect x="-30" y="-20" width="24" height="24" rx="2" fill="#581628" />
            <line x1="-30" y1="-8" x2="-6" y2="-8" stroke="#ffffff" strokeWidth="2" />
            <line x1="-18" y1="-20" x2="-18" y2="4" stroke="#ffffff" strokeWidth="2" />
          </g>

          {/* House 5 (Far Right Overhang) */}
          <g transform="translate(1010, 790) scale(0.85)">
            <rect x="36" y="-120" width="16" height="50" fill="#ffffff" />
            <rect x="-55" y="-50" width="110" height="110" fill="#ffffff" />
            <polygon points="-70,-50 0,-115 70,-50" fill="#ffffff" />
            <path d="M -12 -80 A 12 12 0 0 1 12 -80 L 12 -65 L -12 -65 Z" fill="#581628" />
            <line x1="-12" y1="-72" x2="12" y2="-72" stroke="#ffffff" strokeWidth="2" />
            <line x1="0" y1="-92" x2="0" y2="-65" stroke="#ffffff" strokeWidth="2" />
            <rect x="-40" y="-35" width="30" height="42" rx="2" fill="#581628" />
            <line x1="-40" y1="-21" x2="-10" y2="-21" stroke="#ffffff" strokeWidth="2" />
            <line x1="-40" y1="-7" x2="-10" y2="-7" stroke="#ffffff" strokeWidth="2" />
            <line x1="-25" y1="-35" x2="-25" y2="7" stroke="#ffffff" strokeWidth="2" />
            <rect x="10" y="-35" width="30" height="42" rx="2" fill="#581628" />
            <line x1="10" y1="-21" x2="40" y2="-21" stroke="#ffffff" strokeWidth="2" />
            <line x1="10" y1="-7" x2="40" y2="-7" stroke="#ffffff" strokeWidth="2" />
            <line x1="25" y1="-35" x2="25" y2="7" stroke="#ffffff" strokeWidth="2" />
          </g>

          {/* Pine Tree 4 Far Right */}
          <g transform="translate(1120, 770) scale(0.65)">
            <path fill="#ffffff" d="M 0 -140 L -45 -20 L -30 -20 L -55 30 L -35 30 L -65 90 L 0 90 Z" />
            <path fill="#f0deee" d="M 0 -140 L 45 -20 L 30 -20 L 55 30 L 35 30 L 65 90 L 0 90 Z" />
          </g>

          {/* Far Right Cottage */}
          <g transform="translate(1220, 820) scale(0.8)">
            <rect x="-50" y="-30" width="100" height="80" fill="#ffffff" />
            <polygon points="-60,-30 0,-70 60,-30" fill="#ffffff" />
            <rect x="-30" y="-10" width="22" height="28" rx="2" fill="#581628" />
            <rect x="8" y="-10" width="22" height="28" rx="2" fill="#581628" />
          </g>
        </g>
      </svg>

      {/* Floating Glass Login Card Container */}
      <div style={{
        maxWidth: '420px',
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '28px',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: '0 25px 60px -10px rgba(183, 28, 28, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.08)',
        padding: '40px 36px 36px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        animation: 'popCard 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        margin: '0 auto'
      }}>

        {/* Header Branding */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: '700',
            fontFamily: 'var(--font-serif)',
            color: '#b71c1c',
            marginBottom: '8px',
            letterSpacing: '-0.3px'
          }}>
            Golden Moment
          </h1>
          <p style={{
            fontSize: '0.92rem',
            color: '#880e4f',
            fontWeight: '400',
            lineHeight: '1.4'
          }}>
            Enter your private album password to view your design
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Underline Input Field */}
          <div style={{
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: isFocused ? '1.5px solid #b71c1c' : '1.5px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isFocused ? '0 0 0 4px rgba(183, 28, 28, 0.15), 0 4px 12px rgba(0, 0, 0, 0.04)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.25s ease',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Lock size={19} style={{
              position: 'absolute',
              left: '16px',
              color: isFocused ? '#b71c1c' : '#ad1457',
              transition: 'color 0.2s ease'
            }} />
            
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="e.g. GM001"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={{
                width: '100%',
                padding: '16px 45px 16px 48px',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#2d3748',
                borderRadius: '16px'
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

          {/* Remember Me Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-4px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: '#880e4f',
              fontSize: '0.88rem',
              fontWeight: '500'
            }}>
              <input 
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#b71c1c', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Remember password
            </label>

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
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: '28px',
              border: 'none',
              background: 'linear-gradient(135deg, #c62828 0%, #ad1457 100%)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 10px 25px rgba(183, 28, 28, 0.4)',
              transition: 'all 0.25s ease',
              marginTop: '6px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 14px 30px rgba(183, 28, 28, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(183, 28, 28, 0.4)';
              }
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Unlocking Album...</span>
              </>
            ) : (
              <>
                <span>View Album</span>
                <ChevronRight size={19} strokeWidth={3} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

