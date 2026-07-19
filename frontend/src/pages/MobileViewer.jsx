import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, MessageSquare } from 'lucide-react';
import FeedbackModal from '../components/FeedbackModal';

export default function MobileViewer({ pages, session, fileId }) {
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  const scrollContainerRef = useRef(null);

  // Filter out blank pages that were only needed for the desktop flipbook formatting
  const mobilePages = pages.filter(p => p.type !== 'blank');

  useEffect(() => {
    // Auto-enter fullscreen on first interaction for a native app feel
    const requestFS = () => {
      const el = document.documentElement;
      const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (rfs && !document.fullscreenElement && !document.webkitFullscreenElement) {
        rfs.call(el).catch(() => {
          setImmersiveMode(true);
          window.scrollTo(0, 1);
        });
      }
    };
    document.addEventListener('touchstart', requestFS, { once: true });
    return () => document.removeEventListener('touchstart', requestFS);
  }, []);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollX = scrollContainerRef.current.scrollLeft;
      const width = window.innerWidth;
      const newIndex = Math.round(scrollX / width);
      if (newIndex !== currentPageIndex) {
        setCurrentPageIndex(newIndex);
      }
    }
  };

  const handleApprove = () => {
    alert('Album Approved! Thank you.');
    navigate('/dashboard');
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000000',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* Top Toolbar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '60px',
        backgroundColor: 'rgba(255,255,255,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 15px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 10,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        transform: immersiveMode ? 'translateY(-100%)' : 'translateY(0)',
        opacity: immersiveMode ? 0 : 1,
        pointerEvents: immersiveMode ? 'none' : 'auto'
      }}>
        <button className="btn-outline" style={{ padding: '8px', display: 'flex', gap: '4px', alignItems: 'center' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Back
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 600 }}>{decodeURIComponent(fileId).replace('.pdf', '')}</h2>
          {mobilePages.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-grey-dark)', fontWeight: '500' }}>
              {currentPageIndex === 0 
                ? 'Cover' 
                : currentPageIndex === mobilePages.length - 1 
                  ? 'Back Cover' 
                  : `Page ${currentPageIndex} of ${mobilePages.length - 2}`}
            </span>
          )}
        </div>

        <div style={{ width: '60px' }}></div> {/* Spacer to center title */}
      </div>

      {/* Swipeable Gallery */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onClick={() => setImmersiveMode(!immersiveMode)}
        style={{
          flex: 1,
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {mobilePages.map((pageData, index) => (
          <div 
            key={index} 
            style={{ 
              minWidth: '100vw', 
              height: '100%', 
              scrollSnapAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px'
            }}
          >
            {pageData.imgSrc ? (
              <img 
                src={pageData.imgSrc} 
                alt={`Page ${index}`} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  objectFit: 'contain', 
                  userSelect: 'none' 
                }} 
                draggable={false} 
              />
            ) : (
              <div style={{ color: '#fff', fontSize: '14px' }}>Loading...</div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '15px',
        gap: '15px',
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        transform: immersiveMode ? 'translateY(100%)' : 'translateY(0)',
        opacity: immersiveMode ? 0 : 1,
        pointerEvents: immersiveMode ? 'none' : 'auto'
      }}>
        <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', flex: 1, justifyContent: 'center' }} onClick={() => setShowFeedback(true)}>
          <MessageSquare size={18} /> Request Changes
        </button>
        <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }} onClick={handleApprove}>
          <Check size={18} /> Approve
        </button>
      </div>

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          totalPages={mobilePages.length}
          folderId={session.folderId}
          fileId={fileId}
        />
      )}

    </div>
  );
}
