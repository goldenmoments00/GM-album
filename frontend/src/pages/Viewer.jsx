import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { ArrowLeft, ZoomIn, ZoomOut, Check, MessageSquare } from 'lucide-react';
import FeedbackModal from '../components/FeedbackModal';
import { createBlankPage, sliceSpread } from '../utils/pdfParser';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function Viewer({ session }) {
  const { fileId } = useParams(); // The PDF filename
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [visualProgress, setVisualProgress] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 500, height: 700 });
  const [currentPage, setCurrentPage] = useState(0);
  const [bookState, setBookState] = useState('read');
  const bookRef = useRef();

  useEffect(() => {
    loadPDF();
  }, [fileId]);

  // Fake smooth visual progress
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setVisualProgress(prev => {
          const remaining = 99 - prev;
          // Slows down as it approaches 99%
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

      const pdfUrl = `http://localhost:3000/api/pdf/${session.folderId}/${fileId}`;

      const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });

      loadingTask.onProgress = (p) => {
        if (p.total > 0) {
          // Download progress takes up the first 20% of the bar
          setProgress(Math.round((p.loaded / p.total) * 20));
        }
      };

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      // STEP 1: Rapidly build the book structure using established album rules
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
          // First and Last inside pages are singles
          structure.push({ pdfPage: i, type: 'single', imgSrc: null });
        } else {
          // All middle pages are spreads
          structure.push({ pdfPage: i, type: 'spread-left', imgSrc: null });
          structure.push({ pdfPage: i, type: 'spread-right', imgSrc: null });
        }
      }

      setPages([...structure]);

      // STEP 2: Render first few pages BEFORE hiding loading screen (Cover + First Spread)
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
      setLoading(false); // UI shows up immediately with the first pages fully loaded!

      // STEP 3: Background Render Loop for the rest of the album
      // Give the browser 1.5 seconds to breathe and finish the opening animation before starting heavy background work
      await new Promise(resolve => setTimeout(resolve, 1500));

      for (let i = initialLoadCount; i < structure.length; i++) {
        if (!structure[i].imgSrc) {
          const img = await renderPageToImage(structure[i].pdfPage, structure[i].type);
          structure[i].imgSrc = img;
          setPages([...structure]); // Trigger re-render with new image
          
          // Yield to the main thread for 300ms between each page so flip animations stay butter smooth
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

  return (
    <div className="viewer-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#1a120b', 
      backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(255, 240, 210, 0.25) 0%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.85) 100%), url("/wood-bg.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      overflow: 'hidden' 
    }}>
      {/* Toolbar */}
      <div className="viewer-toolbar" style={{
        height: '60px',
        backgroundColor: 'rgba(255,255,255,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        zIndex: 10
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

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline" style={{ padding: '8px' }} onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
            <ZoomOut size={18} />
          </button>
          <button className="btn-outline" style={{ padding: '8px' }} onClick={() => setScale(s => Math.min(2.5, s + 0.2))}>
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      {/* Flipbook Container */}
      <div className={`flipbook-container ${pages.length > 0 && currentPage >= pages.length - 2 && bookState === 'read' ? 'at-end' : ''}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', transform: `scale(${scale})`, transition: 'transform 0.3s ease', padding: '20px 20px 40px 20px' }}>
        <div style={{ width: '100%', height: 'calc(100vh - 140px)', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {pages.length > 0 && (
            <HTMLFlipBook
            width={dimensions.width}
            height={dimensions.height}
            size="stretch"
            minWidth={315}
            maxWidth={1000}
            minHeight={400}
            maxHeight={1533}
            maxShadowOpacity={0.8}
            showCover={true}
            mobileScrollSupport={true}
            className="album-flipbook"
            ref={bookRef}
            onFlip={(e) => setCurrentPage(e.data)}
            onChangeState={(e) => setBookState(e.data)}
          >
            {pages.map((pageData, index) => (
              <div key={index} className="page">
                <div className={`page-content ${index % 2 === 0 ? 'page-right' : 'page-left'} ${pageData.isCover ? 'cover-page' : ''}`}>
                  {pageData.imgSrc ? (
                    <img src={pageData.imgSrc} alt={`Page ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

      {/* Bottom Action Bar */}
      <div className="viewer-bottom-bar" style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '0 20px 20px 20px',
        gap: '20px',
        zIndex: 10
      }}>
        <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white' }} onClick={() => setShowFeedback(true)}>
          <MessageSquare size={18} /> Request Changes
        </button>
        <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleApprove}>
          <Check size={18} /> Approve Album
        </button>
      </div>

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          totalPages={pages.length}
          folderId={session.folderId}
          fileId={fileId}
        />
      )}

      {/* Force Landscape Prompt for Mobile */}
      <div className="portrait-overlay">
        <svg className="phone-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12.01" y2="18"></line>
        </svg>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Rotate Device</h3>
        <p style={{ color: '#ccc', lineHeight: '1.5' }}>
          Please turn your phone sideways to landscape mode for the best album viewing experience.
        </p>
      </div>
    </div>
  );
}
