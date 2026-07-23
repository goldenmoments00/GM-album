import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { ArrowLeft, Check, MessageSquare, Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut, Pencil } from 'lucide-react';
import FeedbackModal from '../components/FeedbackModal';
import MobileAnnotationEditor from '../components/MobileAnnotationEditor';

// GLOBAL HACK: Override Touch and Mouse Event coordinates when in Portrait mode.
// This allows the physics engine and our panning logic to receive logically correct X/Y coordinates.
const isPortrait = () => window.innerWidth < 768 && window.innerHeight > window.innerWidth;

let originalDescriptors = {};

const applyCoordinateHack = () => {
  if (typeof window === 'undefined') return;
  
  const setupForProto = (Proto, name) => {
    if (!Proto || !Proto.prototype) return;
    if (originalDescriptors[name]) return; // Already applied
    
    const getDesc = (prop) => Object.getOwnPropertyDescriptor(Proto.prototype, prop) || 
                              (typeof MouseEvent !== 'undefined' ? Object.getOwnPropertyDescriptor(MouseEvent.prototype, prop) : null);
                              
    const origX = getDesc('clientX');
    const origY = getDesc('clientY');
    const origPageX = getDesc('pageX');
    const origPageY = getDesc('pageY');
    
    if (origX && origY && origX.configurable) {
      originalDescriptors[name] = { clientX: origX, clientY: origY, pageX: origPageX, pageY: origPageY };
      
      Object.defineProperty(Proto.prototype, 'clientX', { get: function() { return isPortrait() ? origY.get.call(this) : origX.get.call(this); }, configurable: true });
      Object.defineProperty(Proto.prototype, 'clientY', { get: function() { return isPortrait() ? window.innerWidth - origX.get.call(this) : origY.get.call(this); }, configurable: true });
      
      if (origPageX && origPageY) {
        Object.defineProperty(Proto.prototype, 'pageX', { get: function() { return isPortrait() ? origPageY.get.call(this) : origPageX.get.call(this); }, configurable: true });
        Object.defineProperty(Proto.prototype, 'pageY', { get: function() { return isPortrait() ? window.innerWidth - origPageX.get.call(this) : origPageY.get.call(this); }, configurable: true });
      }
    }
  };

  if (typeof Touch !== 'undefined') setupForProto(Touch, 'Touch');
  if (typeof MouseEvent !== 'undefined') setupForProto(MouseEvent, 'MouseEvent');
  if (typeof PointerEvent !== 'undefined') setupForProto(PointerEvent, 'PointerEvent');
};

const removeCoordinateHack = () => {
  const restoreForProto = (Proto, name) => {
    if (!Proto || !Proto.prototype || !originalDescriptors[name]) return;
    const desc = originalDescriptors[name];
    if (desc.clientX) Object.defineProperty(Proto.prototype, 'clientX', desc.clientX);
    if (desc.clientY) Object.defineProperty(Proto.prototype, 'clientY', desc.clientY);
    if (desc.pageX) Object.defineProperty(Proto.prototype, 'pageX', desc.pageX);
    if (desc.pageY) Object.defineProperty(Proto.prototype, 'pageY', desc.pageY);
  };

  if (typeof Touch !== 'undefined') restoreForProto(Touch, 'Touch');
  if (typeof MouseEvent !== 'undefined') restoreForProto(MouseEvent, 'MouseEvent');
  if (typeof PointerEvent !== 'undefined') restoreForProto(PointerEvent, 'PointerEvent');
  
  originalDescriptors = {};
};

const goldenQuotes = [
  "Preserving your golden moments for a lifetime.",
  "Every picture tells the story of a golden moment.",
  "Capturing the golden moments of today for the memories of tomorrow.",
  "Your life is made of golden moments. Here are a few.",
  "Reliving the golden moments that make life beautiful.",
  "Where every memory is a golden moment.",
  "Golden moments, frozen in time."
];

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
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const [randomQuote] = useState(() => goldenQuotes[Math.floor(Math.random() * goldenQuotes.length)]);
  
  const bookRef = useRef();
  const flipbookWrapperRef = useRef(null);
  const panRef = useRef({ startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const lastTapRef = useRef(0);
  
  // State ref for event handlers to always access the latest values without rebinding
  const stateRef = useRef({ scale, pan, pageWidth: 300, pageHeight: 400, availW: window.innerWidth, availH: window.innerHeight });

  useEffect(() => {
    applyCoordinateHack();
    const updateSize = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      removeCoordinateHack();
    };
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

  const updateZoomAndPan = (newScale, newPanX, newPanY, pWidth, pHeight, aW, aH) => {
    if (newScale === 1) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const scaledBookW = (pWidth * 2) * newScale;
    const scaledBookH = pHeight * newScale;
    
    const maxPanX = Math.max(0, (scaledBookW - aW) / 2);
    const maxPanY = Math.max(0, (scaledBookH - aH) / 2);
    
    const clampedX = Math.min(Math.max(newPanX, -maxPanX), maxPanX);
    const clampedY = Math.min(Math.max(newPanY, -maxPanY), maxPanY);
    
    setScale(newScale);
    setPan({ x: clampedX, y: clampedY });
  };

  const onPointerDown = (e) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    if (pointersRef.current.size === 1) {
      const now = Date.now();
      const s = stateRef.current;
      
      if (now - lastTapRef.current < 300) {
        // Double tap
        if (s.scale > 1) {
          updateZoomAndPan(1, 0, 0, s.pageWidth, s.pageHeight, s.availW, s.availH);
        } else {
          const dx = e.clientX - s.availW / 2;
          const dy = e.clientY - s.availH / 2;
          const newScale = 2;
          const scaleRatio = newScale / s.scale;
          const newPanX = s.pan.x * scaleRatio - dx * (scaleRatio - 1);
          const newPanY = s.pan.y * scaleRatio - dy * (scaleRatio - 1);
          updateZoomAndPan(newScale, newPanX, newPanY, s.pageWidth, s.pageHeight, s.availW, s.availH);
        }
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
      
      if (s.scale > 1) setIsDragging(true);
      panRef.current = { startX: e.clientX, startY: e.clientY, lastX: s.pan.x, lastY: s.pan.y };
    }
  };

  const onPointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const s = stateRef.current;

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      
      if (!pinchRef.current) {
        pinchRef.current = { startDist: dist, startScale: s.scale, cx, cy, lastPan: s.pan };
        setIsDragging(false);
      } else {
        const zoomFactor = dist / pinchRef.current.startDist;
        const newScale = Math.min(Math.max(1, pinchRef.current.startScale * zoomFactor), 4);
        
        const dx = pinchRef.current.cx - s.availW / 2;
        const dy = pinchRef.current.cy - s.availH / 2;
        const scaleRatio = newScale / pinchRef.current.startScale;
        
        const newPanX = pinchRef.current.lastPan.x * scaleRatio - dx * (scaleRatio - 1);
        const newPanY = pinchRef.current.lastPan.y * scaleRatio - dy * (scaleRatio - 1);
        
        const dragDx = cx - pinchRef.current.cx;
        const dragDy = cy - pinchRef.current.cy;
        
        updateZoomAndPan(newScale, newPanX + dragDx, newPanY + dragDy, s.pageWidth, s.pageHeight, s.availW, s.availH);
      }
    } else if (pointersRef.current.size === 1 && isDragging) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      updateZoomAndPan(s.scale, panRef.current.lastX + dx, panRef.current.lastY + dy, s.pageWidth, s.pageHeight, s.availW, s.availH);
    }
  };

  const onPointerUp = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      setIsDragging(false);
    } else if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      panRef.current = { startX: remaining.x, startY: remaining.y, lastX: pan.x, lastY: pan.y };
    }
  };

  useEffect(() => {
    const el = flipbookWrapperRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const s = stateRef.current;
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const newScale = Math.min(Math.max(1, s.scale + delta), 4);
      
      if (newScale === s.scale) return;
      
      const dx = e.clientX - s.availW / 2;
      const dy = e.clientY - s.availH / 2;
      const scaleRatio = newScale / s.scale;
      
      const newPanX = s.pan.x * scaleRatio - dx * (scaleRatio - 1);
      const newPanY = s.pan.y * scaleRatio - dy * (scaleRatio - 1);
      
      updateZoomAndPan(newScale, newPanX, newPanY, s.pageWidth, s.pageHeight, s.availW, s.availH);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const isPortraitLayout = screenSize.w < 768 && screenSize.h > screenSize.w;

  // Calculate exact pixel dimensions for perfect aspect ratio fit
  const availW = isPortraitLayout ? screenSize.h : screenSize.w;
  const availH = isPortraitLayout ? screenSize.w : screenSize.h;
  let pageWidth = 300;
  let pageHeight = 400;

  if ((dimensions.baseWidth && dimensions.baseHeight) || (dimensions.width && dimensions.height)) {
    const w = dimensions.baseWidth || dimensions.width;
    const h = dimensions.baseHeight || dimensions.height;
    const bookRatio = (w * 2) / h;
    const screenRatio = availW / availH;

    if (bookRatio > screenRatio) {
      // Limited by width
      const maxW = availW - 20; // 10px padding on edges
      pageWidth = maxW / 2;
      pageHeight = maxW / bookRatio;
    } else {
      // Limited by height
      const maxH = availH - 20; // 10px padding on edges
      pageHeight = maxH;
      pageWidth = (maxH * bookRatio) / 2;
    }
  }

  // Sync latest values to ref for event handlers
  useEffect(() => {
    stateRef.current = { scale, pan, pageWidth, pageHeight, availW, availH };
  }, [scale, pan, pageWidth, pageHeight, availW, availH]);

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
      width: '100%',
      height: '100dvh',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)'
    })
  };

  const getPagesToAnnotate = () => {
    if (pages.length === 0) return [];
    if (currentPage === 0) return [pages[0]?.imgSrc];
    if (currentPage >= pages.length - 2) return [pages[pages.length - 1]?.imgSrc];
    return [pages[currentPage]?.imgSrc, pages[currentPage + 1]?.imgSrc].filter(Boolean);
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
        height: '70px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 10,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        transform: immersiveMode ? 'translateY(-100%)' : 'translateY(0)',
        opacity: immersiveMode ? 0 : 1,
        pointerEvents: immersiveMode ? 'none' : 'auto'
      }}>
        <button className="btn-outline" style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)', borderRadius: '20px' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.9)', color: '#333', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '500' }} onClick={() => setShowFeedback(true)}>
            <MessageSquare size={18} /> Request Changes
          </button>
          <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', border: 'none' }} onClick={handleApprove}>
            <Check size={18} /> Approve Album
          </button>
          <button style={{ padding: '8px', color: '#fff', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={toggleFullscreen} title="Toggle Fullscreen">
            <Maximize size={18} />
          </button>
        </div>
      </div>

      {/* Floating Exit Fullscreen Button for Immersive Mode */}
      {immersiveMode && (
        <button 
          onClick={() => {
            if (document.fullscreenElement && document.exitFullscreen) {
              document.exitFullscreen().catch(console.error);
            }
            setImmersiveMode(false);
          }}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}
          title="Exit Fullscreen"
        >
          <Minimize size={20} />
        </button>
      )}

      {/* Painted Album Name at the Top */}
      {!isPortraitLayout && (
        <div style={{
          position: 'absolute',
          top: '65px',
          left: 0, right: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 6, // Above flipbook background
          opacity: 0.85,
        }}>
          <span style={{
            fontFamily: "'Breathing', cursive",
            fontSize: 'clamp(2.2rem, 3.8vw, 3.2rem)',
            color: '#ffffff',
            mixBlendMode: 'overlay',
            textTransform: 'capitalize',
            marginBottom: '0px',
            textShadow: '0 4px 12px rgba(0,0,0,0.4)',
            lineHeight: 1.1
          }}>
            {decodeURIComponent(fileId).replace('.pdf', '')}
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(0.8rem, 1.1vw, 0.95rem)',
            color: '#ffffff',
            mixBlendMode: 'overlay',
            fontWeight: 300,
            letterSpacing: '1.5px',
            textAlign: 'center',
            padding: '0 20px',
            marginTop: '2px',
            textShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}>
            {randomQuote}
          </span>
        </div>
      )}

      {/* Painted Thank You Text directly on the wood background for proper blending */}
      {!isPortraitLayout && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'none',
          opacity: (pages.length > 0 && currentPage >= pages.length - 2 && bookState === 'read') ? 0.9 : 0,
          transition: 'opacity 1.5s ease 0.3s',
          zIndex: 2 // underneath the flipbook container which is zIndex 5
        }}>
          {/* We recreate the scale/pan transform so it aligns with the book */}
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease'
          }}>
            {/* Positioned exactly in the right half of the book area */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(0, -50%)',
              width: `${pageWidth * 2}px`,
              height: `${pageHeight}px`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              paddingRight: '15%'
            }}>
              <span style={{
                fontFamily: "'Breathing', cursive",
                fontSize: '8rem',
                color: '#ffffff',
                mixBlendMode: 'overlay',
                transform: 'rotate(-5deg)'
              }}>Thank You</span>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={flipbookWrapperRef}
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
              width={pageWidth}
              height={pageHeight}
              size="fixed"
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

      {/* Floating Reset Zoom Button */}
      <button 
        onClick={() => updateZoomAndPan(1, 0, 0, pageWidth, pageHeight, availW, availH)}
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '20px',
          backgroundColor: 'rgba(255,255,255,0.95)',
          border: '1px solid #e0e0e0',
          borderRadius: '24px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
          zIndex: 100,
          cursor: 'pointer',
          fontWeight: '600',
          color: '#333',
          opacity: scale > 1 ? 1 : 0,
          transform: scale > 1 ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.9)',
          pointerEvents: scale > 1 ? 'auto' : 'none',
          transition: 'opacity 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        <RotateCcw size={18} /> Reset Zoom
      </button>

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          totalPages={pages.length}
          folderId={session.folderId}
          fileId={fileId}
        />
      )}

      {/* Mobile Floating Action Button */}
      {window.innerWidth <= 768 && !showAnnotationEditor && (
        <button 
          onClick={() => setShowAnnotationEditor(true)}
          style={{
            position: 'absolute',
            bottom: '30px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '30px',
            backgroundColor: 'rgba(20, 20, 20, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 50,
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.9rem'
          }}
        >
          <Pencil size={18} />
          Suggest Changes
        </button>
      )}

      {/* Mobile Annotation Editor */}
      {showAnnotationEditor && (
        <MobileAnnotationEditor 
          images={getPagesToAnnotate()} 
          onClose={() => setShowAnnotationEditor(false)}
          metadata={{
            albumId: decodeURIComponent(fileId).replace('.pdf', ''),
            pageInfo: currentPage === 0 ? 'Cover' : currentPage >= pages.length - 2 ? 'Back Cover' : `Pages ${currentPage + 1}-${currentPage + 2}`
          }}
        />
      )}
    </div>
  );
}
