import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { ArrowLeft, ZoomIn, ZoomOut, Check, MessageSquare, Maximize } from 'lucide-react';
import FeedbackModal from '../components/FeedbackModal';

// GLOBAL HACK: Override Touch and Mouse Event coordinates when in Portrait mode.
// This allows the physics engine and our panning logic to receive logically correct X/Y coordinates.
const isPortrait = () => window.innerWidth < 768 && window.innerHeight > window.innerWidth;

if (typeof Touch !== 'undefined') {
  const origTouchX = Object.getOwnPropertyDescriptor(Touch.prototype, 'clientX');
  const origTouchY = Object.getOwnPropertyDescriptor(Touch.prototype, 'clientY');
  if (origTouchX && origTouchY) {
    Object.defineProperty(Touch.prototype, 'clientX', { get: function() { return isPortrait() ? origTouchY.get.call(this) : origTouchX.get.call(this); } });
    Object.defineProperty(Touch.prototype, 'pageX', { get: function() { return isPortrait() ? origTouchY.get.call(this) : origTouchX.get.call(this); } });
    Object.defineProperty(Touch.prototype, 'clientY', { get: function() { return isPortrait() ? window.innerWidth - origTouchX.get.call(this) : origTouchY.get.call(this); } });
    Object.defineProperty(Touch.prototype, 'pageY', { get: function() { return isPortrait() ? window.innerWidth - origTouchX.get.call(this) : origTouchY.get.call(this); } });
  }
}

const overrideEventCoord = (Proto) => {
  if (typeof Proto !== 'undefined') {
    const origX = Object.getOwnPropertyDescriptor(Proto.prototype, 'clientX') || Object.getOwnPropertyDescriptor(MouseEvent.prototype, 'clientX');
    const origY = Object.getOwnPropertyDescriptor(Proto.prototype, 'clientY') || Object.getOwnPropertyDescriptor(MouseEvent.prototype, 'clientY');
    if (origX && origY) {
      Object.defineProperty(Proto.prototype, 'clientX', { get: function() { return isPortrait() ? origY.get.call(this) : origX.get.call(this); } });
      Object.defineProperty(Proto.prototype, 'pageX', { get: function() { return isPortrait() ? origY.get.call(this) : origX.get.call(this); } });
      Object.defineProperty(Proto.prototype, 'clientY', { get: function() { return isPortrait() ? window.innerWidth - origX.get.call(this) : origY.get.call(this); } });
      Object.defineProperty(Proto.prototype, 'pageY', { get: function() { return isPortrait() ? window.innerWidth - origX.get.call(this) : origY.get.call(this); } });
    }
  }
};
overrideEventCoord(window.MouseEvent);
overrideEventCoord(window.PointerEvent);

export default function DesktopViewer({ pages, dimensions, session, fileId }) {
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [bookState, setBookState] = useState('read');
  const [screenSize, setScreenSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [immersiveMode, setImmersiveMode] = useState(false);
  
  const bookRef = useRef();
  const panRef = useRef({ startX: 0, startY: 0, lastX: 0, lastY: 0 });

  useEffect(() => {
    const updateSize = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => setImmersiveMode(true));
      } else {
        setImmersiveMode(true); // Fallback for iOS
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setImmersiveMode(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setImmersiveMode(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (scale === 1) setPan({ x: 0, y: 0 });
  }, [scale]);

  const handleApprove = () => {
    alert('Album Approved! Thank you.');
    navigate('/dashboard');
  };

  const onPointerDown = (e) => {
    if (scale === 1) return;
    setIsDragging(true);
    panRef.current = { startX: e.clientX, startY: e.clientY, lastX: pan.x, lastY: pan.y };
  };

  const onPointerMove = (e) => {
    if (!isDragging || scale === 1) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setPan({ x: panRef.current.lastX + dx, y: panRef.current.lastY + dy });
  };

  const onPointerUp = () => setIsDragging(false);

  const isPortraitLayout = screenSize.w < 768 && screenSize.h > screenSize.w;

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a120b',
    backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(255, 240, 210, 0.25) 0%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.85) 100%), url("/wood-bg.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overflow: 'hidden',
    touchAction: 'none',
    zIndex: 0,
    ...(isPortraitLayout ? {
      position: 'fixed',
      top: '50%',
      left: '50%',
      width: '100dvh',
      height: '100dvw',
      transform: 'translate(-50%, -50%) rotate(90deg)',
      transformOrigin: 'center center',
      paddingLeft: 'env(safe-area-inset-top, 0px)',
      paddingRight: 'env(safe-area-inset-bottom, 0px)',
      paddingTop: 'env(safe-area-inset-left, 0px)',
      paddingBottom: 'env(safe-area-inset-right, 0px)'
    } : {
      width: '100dvw',
      height: '100dvh',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)'
    })
  };

  return (
    <div style={containerStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      
      <div 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} 
        onClick={() => setImmersiveMode(!immersiveMode)}
      />

      <div className="viewer-toolbar" style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '60px',
        backgroundColor: 'rgba(255,255,255,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        zIndex: 10,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        transform: immersiveMode ? 'translateY(-100%)' : 'translateY(0)',
        opacity: immersiveMode ? 0 : 1,
        pointerEvents: immersiveMode ? 'none' : 'auto'
      }}>
        <button className="btn-outline" style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem' }}>{decodeURIComponent(fileId).replace('.pdf', '')}</h2>
          {pages.length > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-grey-dark)', marginTop: '4px', fontWeight: '500' }}>
              {currentPage === 0
                ? 'Front Cover'
                : currentPage >= pages.length - 2
                  ? 'Back Cover'
                  : `Pages ${currentPage + 1}-${currentPage + 2} of ${pages.length}`}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '8px 16px' }} onClick={() => setShowFeedback(true)}>
            <MessageSquare size={18} /> Request Changes
          </button>
          <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }} onClick={handleApprove}>
            <Check size={18} /> Approve Album
          </button>
          <button className="btn-outline" style={{ padding: '8px' }} onClick={toggleFullscreen} title="Toggle Fullscreen">
            <Maximize size={18} />
          </button>
          <button className="btn-outline" style={{ padding: '8px' }} onClick={() => setScale(s => Math.max(1, s - 0.2))}>
            <ZoomOut size={18} />
          </button>
          <button className="btn-outline" style={{ padding: '8px' }} onClick={() => setScale(s => Math.min(3, s + 0.2))}>
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      <div 
        className={`flipbook-container ${pages.length > 0 && currentPage >= pages.length - 2 && bookState === 'read' ? 'at-end' : ''}`} 
        style={{ 
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '10px',
          zIndex: 5,
          pointerEvents: 'none'
        }}
      >
        <div style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          pointerEvents: 'auto',
          transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`, 
          transition: isDragging ? 'none' : 'transform 0.3s ease'
        }}>
          {pages.length > 0 && (
            <HTMLFlipBook
              width={dimensions.width}
              height={dimensions.height}
              size="stretch"
              minWidth={100}
              maxWidth={1000}
              minHeight={100}
              maxHeight={1533}
              maxShadowOpacity={0.8}
              showCover={true}
              mobileScrollSupport={true}
              useMouseEvents={scale === 1}
              className="album-flipbook"
              ref={bookRef}
              onFlip={(e) => setCurrentPage(e.data)}
              onChangeState={(e) => setBookState(e.data)}
            >
              {pages.map((pageData, index) => (
                <div key={index} className="page">
                  <div className={`page-content ${index % 2 === 0 ? 'page-right' : 'page-left'} ${pageData.isCover ? 'cover-page' : ''}`}>
                    {pageData.imgSrc ? (
                      <img src={pageData.imgSrc} alt={`Page ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' }} draggable={false} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
                        <div className="loading-spinner" style={{ color: '#ccc' }}>Loading...</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </HTMLFlipBook>
          )}
        </div>
      </div>

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          totalPages={pages.length}
          folderId={session.folderId}
          fileId={fileId}
        />
      )}
    </div>
  );
}
