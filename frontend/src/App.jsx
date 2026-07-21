import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Viewer from './pages/Viewer';
import VideoPlayerPage from './pages/VideoPlayerPage';

function App() {
  const [session, setSession] = useState(null);

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
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
