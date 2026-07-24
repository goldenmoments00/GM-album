import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { BookOpen } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function AlbumThumbnail({ folderId, fileName, thumbnailUrl }) {
  const [thumbnail, setThumbnail] = useState(thumbnailUrl || null);
  const [loading, setLoading] = useState(!thumbnailUrl);

  useEffect(() => {
    if (thumbnailUrl) {
      setThumbnail(thumbnailUrl);
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    const loadThumbnail = async () => {
      try {
        const pdfUrl = `/api/pdf/${folderId}/${fileName}`;
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        // Render at a small scale for thumbnail
        const viewport = page.getViewport({ scale: 0.5 }); 
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        if (isMounted) {
          setThumbnail(canvas.toDataURL('image/jpeg', 0.8));
          setLoading(false);
        }
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        if (isMounted) setLoading(false);
      }
    };

    loadThumbnail();
    
    return () => {
      isMounted = false;
    };
  }, [folderId, fileName, thumbnailUrl]);

  if (loading || !thumbnail) {
    return (
      <div className="skeleton-box" style={{ 
        width: '100%', 
        height: '100%',
        aspectRatio: '16/9',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
      }}>
        <BookOpen size={40} color="var(--color-border)" />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      aspectRatio: '16/9',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      perspective: '1000px',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Book Cover Container */}
      <div style={{
        height: '100%',
        position: 'relative',
        boxShadow: '12px 12px 24px rgba(0,0,0,0.3), inset -2px 0 5px rgba(0,0,0,0.1)',
        borderRadius: '3px 12px 12px 3px',
        overflow: 'hidden',
        backgroundColor: '#fff'
      }}>
        <img src={thumbnail} alt="Album Cover" style={{ height: '100%', width: 'auto', display: 'block', objectFit: 'contain' }} />
        
        {/* Leather/Dark Spine */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: '35px',
          background: 'linear-gradient(to right, #111 0%, #222 15%, #1a1a1a 80%, #000 100%)',
          zIndex: 5
        }}></div>

        {/* Hinge Groove (Crease) */}
        <div style={{
          position: 'absolute', top: 0, left: '35px', bottom: 0,
          width: '12px',
          background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(255,255,255,0.1) 40%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0) 100%)',
          zIndex: 5
        }}></div>

        {/* Overall Gloss Overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(120deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 30%, rgba(0,0,0,0.05) 100%)',
          pointerEvents: 'none',
          zIndex: 10
        }}></div>
      </div>
    </div>
  );
}
