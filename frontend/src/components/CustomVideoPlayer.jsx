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
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setProgress((video.currentTime / video.duration) * 100 || 0);
        setCurrentTime(video.currentTime);
      }
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
        if (video.readyState >= 3) {
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

    // Failsafe: Check readyState periodically in case events are missed
    const checkReady = setInterval(() => {
      if (video.readyState >= 3) {
        setIsBuffering(false);
      }
    }, 500);

    return () => {
      clearInterval(checkReady);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('progress', handleProgress);
    };
  }, [videoRef, onPause, isDragging]);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleSeekChange = (e) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    const seekTime = (newProgress / 100) * duration;
    setCurrentTime(seekTime);
  };

  const handleSeekEnd = (e) => {
    setIsDragging(false);
    const newProgress = parseFloat(e.target.value);
    const seekTime = (newProgress / 100) * duration;
    if (isFinite(seekTime)) {
      videoRef.current.currentTime = seekTime;
    }
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
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .custom-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        .custom-range-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
      `}</style>
      
      {/* Loading & Buffering Overlay */}
      {isBuffering && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <Loader2 
            size={42} 
            color="var(--color-gold)" 
            style={{ animation: 'spin 1s linear infinite' }} 
          />
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        style={{ width: 'auto', maxWidth: '100%', maxHeight: '75vh', display: 'block', margin: '0 auto' }}
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
        webkit-playsinline="true"
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
          step="0.1"
          value={progress || 0} 
          onPointerDown={() => setIsDragging(true)}
          onChange={handleSeekChange}
          onPointerUp={handleSeekEnd}
          style={{ 
            width: '100%', 
            cursor: 'pointer',
            height: '6px',
            borderRadius: '3px',
            WebkitAppearance: 'none',
            appearance: 'none',
            background: `linear-gradient(to right, var(--color-gold) ${progress || 0}%, rgba(255,255,255,0.3) ${progress || 0}%)`
          }}
          className="custom-range-slider"
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
