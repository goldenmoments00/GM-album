import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { ArrowLeft, ZoomIn, ZoomOut, Check, MessageSquare, Maximize } from 'lucide-react';
import FeedbackModal from '../components/FeedbackModal';
import { createBlankPage, sliceSpread } from '../utils/pdfParser';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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


export default function Viewer({ session }) {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [visualProgress, setVisualProgress] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 500, height: 700 });
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

  useEffect(() => {
    loadPDF();
  }, [fileId]);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setVisualProgress(prev => {
          const remaining = 99 - prev;
          const increment = Math.max(0.5, Math.random() * (remaining / 8));
          return Math.min(99, prev + increment);
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      const pdfUrl = `/api/pdf/${session.folderId}/${fileId}`;
      const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });

      loadingTask.onProgress = (p) => {
        if (p.total > 0) setProgress(Math.round((p.loaded / p.total) * 20));
      };

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const structure = [];
      const page1 = await pdf.getPage(1);
      const viewport1 = page1.getViewport({ scale: 1.5 });
      const singlePageWidth = viewport1.width;
      const singlePageHeight = viewport1.height;

      setDimensions({
        width: 500,
        height: 500 * (singlePageHeight / singlePageWidth)
      });

      for (let i = 1; i <= numPages; i++) {
        if (i === 1) {
          structure.push({ pdfPage: 1, type: 'single', imgSrc: null, isCover: true });
          structure.push({ pdfPage: 1, type: 'blank', imgSrc: createBlankPage(singlePageWidth, singlePageHeight) });
        } else if (i === numPages) {
          if (structure.length % 2 === 0) {
            structure.push({ pdfPage: numPages, type: 'blank', imgSrc: createBlankPage(singlePageWidth, singlePageHeight), isLastBlank: true });
          }
          structure.push({ pdfPage: numPages, type: 'single', imgSrc: null, isCover: true });
        } else if (i === 2 || i === numPages - 1) {
          structure.push({ pdfPage: i, type: 'single', imgSrc: null });
        } else {
          structure.push({ pdfPage: i, type: 'spread-left', imgSrc: null });
          structure.push({ pdfPage: i, type: 'spread-right', imgSrc: null });
        }
      }

      setPages([...structure]);

      const renderPageToImage = async (pdfPageNum, type) => {
        const page = await pdf.getPage(pdfPageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;

        if (type === 'spread-left' || type === 'spread-right') {
          const [left, right] = sliceSpread(canvas);
          return type === 'spread-left' ? left : right;
        }
        return canvas.toDataURL('image/jpeg', 0.8);
      };

      const initialLoadCount = Math.min(5, structure.length);
      for (let i = 0; i < initialLoadCount; i++) {
        if (!structure[i].imgSrc) {
          structure[i].imgSrc = await renderPageToImage(structure[i].pdfPage, structure[i].type);
        }
      }

      setPages([...structure]);
      setLoading(false);
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      for (let i = initialLoadCount; i < structure.length; i++) {
        if (!structure[i].imgSrc) {
          structure[i].imgSrc = await renderPageToImage(structure[i].pdfPage, structure[i].type);
          setPages([...structure]); 
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. Please try again.');
      setLoading(false);
    }
  };

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

  if (loading) {
    const displayProgress = Math.round(visualProgress);
    let loadingMessage = "Preparing your memories...";
    if (displayProgress < 30) loadingMessage = "Downloading high-resolution album...";
    else if (displayProgress < 60) loadingMessage = "Organizing pages...";
    else if (displayProgress < 90) loadingMessage = "Binding your book...";
    else loadingMessage = "Adding finishing touches...";

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h2 style={{ color: 'var(--color-gold)', marginBottom: '10px' }}>Loading Your Album...</h2>
        <p style={{ color: 'var(--color-grey-dark)', marginBottom: '20px', fontStyle: 'italic' }}>{loadingMessage}</p>
        <div style={{ width: '300px', height: '4px', backgroundColor: 'var(--color-grey-soft)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${displayProgress}%`, height: '100%', backgroundColor: 'var(--color-gold)', transition: 'width 0.2s ease-out' }}></div>
        </div>
        <p style={{ marginTop: '10px', color: 'var(--color-grey-dark)', fontWeight: '500' }}>{displayProgress}%</p>
      </div>
    );
  }

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
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: `${screenSize.h}px`,
      height: `${screenSize.w}px`,
      transform: 'translate(-50%, -50%) rotate(90deg)',
      transformOrigin: 'center center',
      // Map physical safe areas to rotated logical ones
      paddingLeft: 'env(safe-area-inset-top, 0px)',
      paddingRight: 'env(safe-area-inset-bottom, 0px)',
      paddingTop: 'env(safe-area-inset-left, 0px)',
      paddingBottom: 'env(safe-area-inset-right, 0px)'
    } : {
      width: '100vw',
      height: '100vh',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)'
    })
  };

  return (
    <div style={containerStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      
      {/* Background Tap for Immersive Mode Toggle */}
      <div 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} 
        onClick={() => setImmersiveMode(!immersiveMode)}
      />

      {/* Toolbar */}
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

      {/* Flipbook Container */}
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
          pointerEvents: 'none' // Let events pass through to the flipbook
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
