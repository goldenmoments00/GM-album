import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DesktopViewer from './DesktopViewer';
import { usePdfLoader } from '../hooks/usePdfLoader';

export default function Viewer({ session }) {
  const { fileId } = useParams();
  
  // Use custom hook to load PDF pages and dimensions
  const { pages, loading, visualProgress, dimensions } = usePdfLoader(session, fileId);
  


  if (loading) {
    const displayProgress = Math.round(visualProgress);
    let loadingMessage = "Preparing your memories...";
    if (displayProgress < 30) loadingMessage = "Downloading high-resolution album...";
    else if (displayProgress < 60) loadingMessage = "Organizing pages...";
    else if (displayProgress < 90) loadingMessage = "Binding your book...";
    else loadingMessage = "Adding finishing touches...";

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#ffffff' }}>
        <img 
          src="/loading.gif" 
          alt="Loading..." 
          style={{ 
            width: 'min(80vw, 600px)', 
            aspectRatio: '16/9', 
            objectFit: 'cover', 
            objectPosition: 'top',
            marginBottom: '10px' 
          }} 
        />
        <h2 style={{ 
          color: 'var(--color-primary)', 
          marginBottom: '10px', 
          textTransform: 'uppercase', 
          fontFamily: 'var(--font-heading)',
          letterSpacing: '1px'
        }}>
          Loading Your Album...
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>{loadingMessage}</p>
        <div style={{ width: '300px', height: '4px', backgroundColor: 'rgba(139, 21, 26, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${displayProgress}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.2s ease-out' }}></div>
        </div>
        <p style={{ marginTop: '10px', color: 'var(--color-text-muted)', fontWeight: '500', fontFamily: 'var(--font-sans)' }}>{displayProgress}%</p>
      </div>
    );
  }

  // Pass everything down to the specific viewer
  const viewerProps = {
    pages,
    dimensions,
    session,
    fileId
  };

  return <DesktopViewer {...viewerProps} />;
}
