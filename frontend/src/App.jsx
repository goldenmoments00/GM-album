import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Viewer from './pages/Viewer';
import VideoPlayerPage from './pages/VideoPlayerPage';
import EditorView from './pages/EditorView';

function App() {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const autoLogin = async () => {
      const savedPassword = localStorage.getItem('savedPassword');
      if (savedPassword) {
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: savedPassword })
          });
          const data = await response.json();
          if (response.ok) {
            setSession({
              folderId: data.folderId,
              albumId: data.albumId,
              albums: data.albums
            });
          }
        } catch (err) {
          console.error('Auto login failed:', err);
        }
      }
      setIsInitializing(false);
    };
    autoLogin();
  }, []);

  if (isInitializing) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-cream)', color: 'var(--color-primary)', fontSize: '1.2rem' }}>Loading...</div>;
  }

  return (
    <Router>
      <div className="page-container" style={{
        backgroundImage: 'linear-gradient(135deg, var(--color-grey-soft) 0%, #ebebeb 100%)'
      }}>
        <Routes>
          <Route path="/login" element={<Login onLogin={setSession} />} />
          <Route 
            path="/dashboard" 
            element={session ? <Dashboard session={session} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/viewer/:fileId" 
            element={session ? <Viewer session={session} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/video/:fileId" 
            element={session ? <VideoPlayerPage session={session} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/editor/:folderId/:albumId" 
            element={<EditorView />} 
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
