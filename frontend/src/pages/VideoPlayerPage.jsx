import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomVideoPlayer from '../components/CustomVideoPlayer';
import { ArrowLeft, Send, Check, AlertCircle, Trash2, Mic, Square, Play } from 'lucide-react';

export default function VideoPlayerPage({ session }) {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const { folderId } = session;
  
  const videoRef = useRef(null);
  const [videoData, setVideoData] = useState({ comments: [], status: 'Waiting for Review' });
  const [newComment, setNewComment] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [copied, setCopied] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceUrl, setVoiceUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/mp4';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setVoiceBlob(audioBlob);
        setVoiceUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
        
        // Auto-send the voice note
        submitComment(newComment, audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing mic', err);
      alert('Could not access microphone. Please ensure you have granted microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceBlob(null);
    setVoiceUrl(null);
    setRecordingTime(0);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitComment = async (textParam, blobParam) => {
    const text = typeof textParam === 'string' ? textParam : newComment;
    const blob = blobParam instanceof Blob ? blobParam : voiceBlob;

    if ((!text.trim() && !blob) || isSubmitting) return;

    setIsSubmitting(true);
    const timeToSave = videoRef.current ? videoRef.current.currentTime : currentTimestamp;

    const formData = new FormData();
    formData.append('folderId', folderId);
    formData.append('fileId', fileId);
    formData.append('timestamp', timeToSave);
    formData.append('commentText', text);

    if (blob) {
      const ext = blob.type.includes('mp4') ? 'mp4' : 
                  blob.type.includes('webm') ? 'webm' : 
                  blob.type.includes('ogg') ? 'ogg' : 'm4a';
      formData.append('voice', blob, `voice.${ext}`);
    }

    try {
      const response = await fetch('/api/video/comment', {
        method: 'POST',
        body: formData
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
        deleteRecording();
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    submitComment();
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const response = await fetch('/api/video/comment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, fileId, commentId })
      });
      const data = await response.json();
      if (data.success) {
        setVideoData(prev => ({
          ...prev,
          comments: prev.comments.filter(c => c.id !== commentId)
        }));
      }
    } catch (err) {
      console.error('Failed to delete comment', err);
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
    if (isNaN(time)) return '0:00';
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
    
    const cleanFileId = fileId.replace(/\.[^/.]+$/, '');
    const text = `Review has been placed for Project: ${folderId} - File: ${cleanFileId}. Kindly check.`;
    
    if (isMobile) {
      const url = `https://wa.me/916009426410?text=${encodeURIComponent(text)}`;
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
          <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
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
              {!isRecording && !voiceBlob && (
                <button type="button" onClick={startRecording} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', padding: 0, borderRadius: '8px' }}>
                  <Mic size={18} />
                </button>
              )}
              <button type="submit" disabled={isSubmitting || (!newComment.trim() && !voiceBlob)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: isSubmitting || (!newComment.trim() && !voiceBlob) ? 0.5 : 1, cursor: isSubmitting || (!newComment.trim() && !voiceBlob) ? 'not-allowed' : 'pointer' }}>
                <Send size={16} /> {isSubmitting ? 'SENDING...' : 'SEND'}
              </button>
            </div>

            {isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 15px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                <span style={{ color: '#ef4444', fontWeight: 'bold', flex: 1 }}>Recording... {formatTime(recordingTime)} / 1:00</span>
                <button type="button" onClick={stopRecording} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                  <Square size={14} fill="currentColor" /> Stop
                </button>
              </div>
            )}

            {voiceBlob && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <audio src={voiceUrl} controls style={{ height: '35px', flex: 1 }} />
                <button type="button" onClick={deleteRecording} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            )}
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
              videoData.comments.map((comment, index) => (
                <div key={comment.id} style={{ 
                  padding: '15px', 
                  backgroundColor: 'rgba(255,255,255,0.6)', 
                  borderRadius: '8px', 
                  borderLeft: '3px solid var(--color-primary)',
                  borderBottom: index !== videoData.comments.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button 
                        onClick={() => seekTo(comment.timestamp)}
                        style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        {formatTime(comment.timestamp)}
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Delete Feedback"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.95rem' }}>{comment.text}</p>
                  
                  {comment.googleDriveVoiceFileId && (
                    <div style={{ marginTop: '10px' }}>
                      <audio src={`/api/drive/file/${comment.googleDriveVoiceFileId}`} controls style={{ width: '100%', height: '35px' }} />
                    </div>
                  )}
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
