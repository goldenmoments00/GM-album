import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { BookOpen } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function AlbumThumbnail({ folderId, fileName }) {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadThumbnail = async () => {
      try {
        const pdfUrl = `http://localhost:3000/api/pdf/${folderId}/${fileName}`;
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        // Render at a small scale for thumbnail
        const viewport = page.getViewport({ scale: 0.3 }); 
        
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
  }, [folderId, fileName]);

  if (loading || !thumbnail) {
    return (
      <div style={{ 
        width: '100%', 
        height: '200px', 
        backgroundColor: 'var(--color-grey-light)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <BookOpen size={40} color="var(--color-grey-soft)" />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '200px',
      marginBottom: '20px',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    }}>
      <img src={thumbnail} alt="Album Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}
