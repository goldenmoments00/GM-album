import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Loader2 } from 'lucide-react';

export default function CustomVideoPlayer({ src, onPause, forwardedRef }) {
  const videoRef = forwardedRef || useRef(null);
  const containerRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [bufferPercent, setBufferPercent] = useState(0);
  const [loadPercent, setLoadPercent] = useState(5);

  useEffect(() => {
    let interval;
    if (isBuffering) {
      interval = setInterval(() => {
        setLoadPercent(prev => {
          if (bufferPercent > prev) return bufferPercent;
          if (prev < 90) return prev + Math.floor(Math.random() * 4 + 2);
          if (prev < 98) return prev + 1;
          return prev;
        });
      }, 150);
    } else {
      setLoadPercent(100);
    }
    return () => clearInterval(interval);
  }, [isBuffering, bufferPercent]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / video.duration) * 100);
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      if (onPause) onPause(video.currentTime);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlaying = () => setIsBuffering(false);

    const handleProgress = () => {
      if (video.duration > 0 && video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const pct = Math.min(100, Math.round((bufferedEnd / video.duration) * 100));
        setBufferPercent(pct);
        if (pct > 5 || video.readyState >= 3) {
          setIsBuffering(false);
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('progress', handleProgress);
    };
  }, [videoRef, onPause]);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * videoRef.current.duration;
    videoRef.current.currentTime = seekTime;
    setProgress(e.target.value);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    videoRef.current.muted = !isMuted;
    if (isMuted && volume === 0) {
      setVolume(1);
      videoRef.current.volume = 1;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const changePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    videoRef.current.playbackRate = rate;
    setShowSettings(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div 
      ref={containerRef} 
      className="custom-video-player" 
      style={{ 
        position: 'relative', 
        width: 'fit-content',
        maxWidth: '100%',
        minWidth: '280px',
        minHeight: '180px',
        margin: '0 auto', 
        backgroundColor: '#000', 
        borderRadius: '12px', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center' 
      }}
      onContextMenu={(e) => e.preventDefault()} // Prevent right-click to save
    >
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      
      {/* Loading & Buffering Overlay */}
      {isBuffering && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          padding: '20px',
          gap: '10px'
        }}>
          <Loader2 
            size={42} 
            color="var(--color-gold)" 
            style={{ animation: 'spin 1s linear infinite' }} 
          />
          <div style={{ color: '#ffffff', fontSize: '1.6rem', fontWeight: '700', letterSpacing: '1px' }}>
            {loadPercent}%
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', fontWeight: '500' }}>
            Loading Video...
          </div>
          <div style={{ width: '180px', height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{ width: `${loadPercent}%`, height: '100%', backgroundColor: 'var(--color-gold)', transition: 'width 0.2s ease-out' }} />
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        style={{ width: 'auto', maxWidth: '100%', maxHeight: '75vh', display: 'block', margin: '0 auto' }}
        controlsList="nodownload"
        disablePictureInPicture
        onClick={togglePlay}
      />
      
      {/* Custom Controls Overlay */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          padding: '20px 20px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          transition: 'opacity 0.3s'
        }}
      >
        {/* Seek bar */}
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress || 0} 
          onChange={handleSeek}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={togglePlay} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range" 
                min="0" max="1" step="0.05" 
                value={isMuted ? 0 : volume} 
                onChange={handleVolumeChange}
                style={{ width: '60px', cursor: 'pointer' }}
              />
            </div>
            
            <span style={{ color: '#fff', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
            <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <Settings size={20} />
            </button>
            
            {showSettings && (
              <div style={{ position: 'absolute', bottom: '100%', right: '30px', backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {[0.5, 1, 1.5, 2].map(rate => (
                  <button 
                    key={rate} 
                    onClick={() => changePlaybackRate(rate)}
                    style={{ background: 'none', border: 'none', color: rate === playbackRate ? 'var(--color-gold)' : '#fff', cursor: 'pointer', textAlign: 'left', padding: '5px' }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}

            <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
