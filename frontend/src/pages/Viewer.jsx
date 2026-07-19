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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1a120b' }}>
        <h2 style={{ color: 'var(--color-gold)', marginBottom: '10px' }}>Loading Your Album...</h2>
        <p style={{ color: 'var(--color-grey-dark)', marginBottom: '20px', fontStyle: 'italic' }}>{loadingMessage}</p>
        <div style={{ width: '300px', height: '4px', backgroundColor: 'var(--color-grey-soft)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${displayProgress}%`, height: '100%', backgroundColor: 'var(--color-gold)', transition: 'width 0.2s ease-out' }}></div>
        </div>
        <p style={{ marginTop: '10px', color: 'var(--color-grey-dark)', fontWeight: '500' }}>{displayProgress}%</p>
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
