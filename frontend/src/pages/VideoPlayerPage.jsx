import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomVideoPlayer from '../components/CustomVideoPlayer';
import { ArrowLeft, Send, Check, AlertCircle } from 'lucide-react';

export default function VideoPlayerPage({ session }) {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const { folderId } = session;
  
  const videoRef = useRef(null);
  const [videoData, setVideoData] = useState({ comments: [], status: 'Waiting for Review' });
  const [newComment, setNewComment] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [copied, setCopied] = useState(false);
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    fetch(`/api/video/data/${folderId}/${encodeURIComponent(fileId)}`)
      .then(res => res.json())
      .then(data => setVideoData(data))
      .catch(console.error);
  }, [folderId, fileId]);

  const handlePause = (time) => {
    setCurrentTimestamp(time);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const timeToSave = videoRef.current ? videoRef.current.currentTime : currentTimestamp;

    try {
      const response = await fetch('/api/video/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          fileId,
          timestamp: timeToSave,
          commentText: newComment
        })
      });
      const data = await response.json();
      if (data.success) {
        setVideoData(prev => {
          const mergedComments = [...prev.comments];
          data.comments.forEach(c => {
            if (!mergedComments.find(mc => mc.id === c.id)) {
              mergedComments.push(c);
            }
          });
          // Sort comments by timestamp
          mergedComments.sort((a, b) => a.timestamp - b.timestamp);
          return { ...prev, comments: mergedComments };
        });
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      const response = await fetch('/api/video/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, fileId, status })
      });
      const data = await response.json();
      if (data.success) {
        setVideoData(prev => ({ ...prev, status: data.video.status }));
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play(); // Auto-play when seeking to a comment
    }
  };

  const handleShare = () => {
    if (videoData.comments.length === 0) return;
    
    let text = `*Feedback for Video: ${fileId.replace(/\.[^/.]+$/, '')}*\n\n`;
    videoData.comments.forEach(c => {
      text += `[${formatTime(c.timestamp)}] ${c.text}\n`;
    });
    text += `\nStatus: ${videoData.status}`;
    
    if (isMobile) {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      {/* Top Bar */}
      <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <button className="btn-outline" style={{ display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '500', marginRight: '5px', whiteSpace: 'nowrap' }}>
            Status: {videoData.status}
          </span>
          <button className="btn-outline" onClick={() => updateStatus('Needs Changes')} style={{ display: 'flex', gap: '5px', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <AlertCircle size={16} /> Needs Changes
          </button>
          <button className="btn-primary" onClick={() => updateStatus('Approved')} style={{ display: 'flex', gap: '5px', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <Check size={16} /> Approve Video
          </button>
        </div>
      </div>

      <h1 style={{ width: '100%', textAlign: 'center', marginBottom: '20px', fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', wordBreak: 'break-word' }}>{fileId.replace(/\.(mp4|mov)$/i, '')}</h1>

      {/* Main Grid Layout for Player & Comments */}
      <div style={{ width: '100%', display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Main Content Area */}
        <div style={{ flex: '1 1 min(100%, 650px)', width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <CustomVideoPlayer 
              src={`/api/video/stream/${folderId}/${encodeURIComponent(fileId)}`} 
              onPause={handlePause}
              forwardedRef={videoRef}
            />
          </div>
        
        {/* Comment Input */}
        <div className="glass-panel" style={{ padding: '20px', marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Add Feedback</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
            Pause the video where you'd like to leave a comment. Current Timestamp: <strong>{formatTime(currentTimestamp)}</strong>
          </p>
          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              className="input-elegant" 
              placeholder="Type your comment here..." 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onFocus={() => {
                if (videoRef.current && !videoRef.current.paused) {
                  videoRef.current.pause();
                }
              }}
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              <Send size={16} /> {isSubmitting ? 'SENDING...' : 'SEND'}
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar for Comments */}
      <div style={{ flex: '1 1 min(100%, 350px)', maxWidth: '100%' }}>
        <div className="glass-panel" style={{ padding: '20px', height: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>Feedback History</h3>
            {videoData.comments.length > 0 && (
              <button 
                onClick={handleShare}
                style={{ background: copied ? 'var(--color-primary)' : (isMobile ? '#25D366' : 'var(--color-text-muted)'), color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
              >
                {copied ? 'Copied!' : (isMobile ? 'Send via WhatsApp' : 'Copy Feedback')}
              </button>
            )}
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {videoData.comments.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '20px' }}>No comments yet.</p>
            ) : (
              videoData.comments.map(comment => (
                <div key={comment.id} style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <button 
                      onClick={() => seekTo(comment.timestamp)}
                      style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      {formatTime(comment.timestamp)}
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.95rem' }}>{comment.text}</p>
                </div>
              ))
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
