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
  const [showFeedback, setShowFeedback] = useState(false);
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 500, height: 700 });
  const bookRef = useRef();

  useEffect(() => {
    loadPDF();
  }, [fileId]);

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
      const pageImages = [];
      let singlePageWidth = 0;
      let singlePageHeight = 0;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        // Reduced scale from 2 to 1.5 for a massive performance boost (44% fewer pixels) 
        // while remaining highly crisp on modern screens.
        const viewport = page.getViewport({ scale: 1.5 });

        if (i === 1) {
          singlePageWidth = viewport.width;
          singlePageHeight = viewport.height;
          // Set flipbook aspect ratio based on the first single page
          setDimensions({
            width: 500,
            height: 500 * (singlePageHeight / singlePageWidth)
          });
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const isSpread = viewport.width > singlePageWidth * 1.5;

        if (i === 1) {
          // Front Cover
          pageImages.push(canvas.toDataURL('image/jpeg', 0.8));
          // Insert a blank page for the inside of the front cover so the next page starts on the right
          pageImages.push(createBlankPage(singlePageWidth, singlePageHeight));
        } else if (i === numPages) {
          // Back Cover - ensure it lands on an EVEN page (LEFT side of the spread)
          if (pageImages.length % 2 === 0) {
            pageImages.push(createBlankPage(singlePageWidth, singlePageHeight));
          }
          pageImages.push(canvas.toDataURL('image/jpeg', 0.8));
        } else if (isSpread) {
          // Slice the double-spread into two single pages
          const [left, right] = sliceSpread(canvas);
          pageImages.push(left);
          pageImages.push(right);
        } else {
          // Normal single page
          pageImages.push(canvas.toDataURL('image/jpeg', 0.8));
        }

        // Update rendering progress (20% to 100%)
        setProgress(20 + Math.round((i / numPages) * 80));
        // Yield to browser to actually update the UI
        await new Promise(r => setTimeout(r, 0));
      }

      setPages(pageImages);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    alert('Album Approved! Thank you.');
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h2 style={{ color: 'var(--color-gold)', marginBottom: '20px' }}>Loading Your Album...</h2>
        <div style={{ width: '300px', height: '4px', backgroundColor: 'var(--color-grey-soft)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--color-gold)', transition: 'width 0.3s' }}></div>
        </div>
        <p style={{ marginTop: '10px', color: 'var(--color-grey-dark)' }}>{progress}%</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#e5e5e5' }}>
      {/* Toolbar */}
      <div style={{
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

        <h2 style={{ fontSize: '1.2rem' }}>{decodeURIComponent(fileId).replace('.pdf', '')}</h2>

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
      <div className="flipbook-container" style={{ transform: `scale(${scale})`, transition: 'transform 0.3s ease' }}>
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
          >
            {pages.map((imgSrc, index) => (
              <div key={index} className="page">
                <div className="page-content">
                  <img src={imgSrc} alt={`Page ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            ))}
          </HTMLFlipBook>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
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
    </div>
  );
}
