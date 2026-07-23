import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumThumbnail from '../components/AlbumThumbnail';
import { Film, BookOpen, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Play } from 'lucide-react';

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const { folderId, albumId, albums } = session;
  const [activeTab, setActiveTab] = useState('albums');
  const [videos, setVideos] = useState([]);
  const [projectStatus, setProjectStatus] = useState({ videos: {}, albums: {} });
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/videos/${folderId}`)
      .then(res => res.json())
      .then(data => setVideos(data.videos || []))
      .catch(console.error);

    fetch(`/api/project-status/${folderId}`)
      .then(res => res.json())
      .then(data => setProjectStatus(data))
      .catch(console.error);
  }, [folderId]);

  const handleOpenAlbum = (fileName) => {
    navigate(`/viewer/${encodeURIComponent(fileName)}`);
  };
  
  const handleOpenVideo = (fileName) => {
    navigate(`/video/${encodeURIComponent(fileName)}`);
  };

  const getStatusIcon = (status) => {
    if (status === 'Approved') return <CheckCircle size={16} color="currentColor" />;
    if (status === 'Needs Changes') return <AlertCircle size={16} color="currentColor" />;
    return <Clock size={16} color="currentColor" />;
  };

  const getStatusColor = (status) => {
    if (status === 'Approved') return 'var(--color-success)'; // Green
    if (status === 'Needs Changes') return 'var(--color-gold)'; // Gold
    return 'var(--color-error)'; // Red (Waiting for Review)
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--color-gold)', marginBottom: '10px' }}>
          Project: {albumId}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
          Please review and approve your albums and videos below.
        </p>
      </header>

      {/* Progress Overview */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '15px', color: 'var(--color-gold)' }}>Progress Overview</h3>
        
        {/* Progress Bar */}
        {(() => {
          const allItems = [...albums, ...videos];
          const totalItems = allItems.length;
          
          const stats = allItems.reduce((acc, item) => {
            const isVideo = videos.includes(item);
            const status = isVideo 
              ? projectStatus?.videos?.[item.file]?.status || 'Waiting for Review'
              : projectStatus?.albums?.[item.file]?.status || 'Waiting for Review';
              
            if (status === 'Approved') acc.approved++;
            else if (status === 'Needs Changes') acc.changes++;
            else acc.waiting++;
            return acc;
          }, { approved: 0, changes: 0, waiting: 0 });

          const approvedPct = totalItems ? (stats.approved / totalItems) * 100 : 0;
          const changesPct = totalItems ? (stats.changes / totalItems) * 100 : 0;
          const waitingPct = totalItems ? (stats.waiting / totalItems) * 100 : 0;

          return (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-success)'}}/> {stats.approved} Approved</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-gold)'}}/> {stats.changes} Needs Changes</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-error)'}}/> {stats.waiting} Waiting</span>
              </div>
              <div style={{ width: '100%', height: '14px', borderRadius: '8px', display: 'flex', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                {approvedPct > 0 && <div style={{ width: `${approvedPct}%`, backgroundColor: 'var(--color-success)', transition: 'width 0.5s ease' }} title={`Approved: ${stats.approved}`} />}
                {changesPct > 0 && <div style={{ width: `${changesPct}%`, backgroundColor: 'var(--color-gold)', transition: 'width 0.5s ease' }} title={`Needs Changes: ${stats.changes}`} />}
                {waitingPct > 0 && <div style={{ width: `${waitingPct}%`, backgroundColor: 'var(--color-error)', transition: 'width 0.5s ease' }} title={`Waiting: ${stats.waiting}`} />}
              </div>
            </div>
          );
        })()}

        <button 
          onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
          style={{ 
            background: 'none', border: '1px solid rgba(197, 160, 89, 0.3)', 
            padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', 
            display: 'flex', alignItems: 'center', gap: '10px', 
            fontSize: '0.95rem', color: 'var(--color-gold)', fontWeight: '600', 
            width: '100%', justifyContent: 'space-between',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(197, 160, 89, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {isOverviewExpanded ? 'Hide Detailed List' : 'View Detailed List'}
          {isOverviewExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {isOverviewExpanded && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginTop: '15px' }}>
            {albums.map((a, i) => {
              const bgColor = status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : status === 'Needs Changes' ? 'rgba(197, 160, 89, 0.1)' : 'rgba(239, 68, 68, 0.1)';
              return (
                <div key={`a-${i}`} style={{ 
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  padding: '10px 12px', backgroundColor: bgColor, borderRadius: '10px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: `3px solid ${getStatusColor(status)}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(0,0,0,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={16} style={{ flexShrink: 0, color: getStatusColor(status) }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>{a.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600', padding: '3px 6px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.5)', color: getStatusColor(status), width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {getStatusIcon(status)}
                    {status}
                  </div>
                </div>
              );
            })}
            {videos.map((v, i) => {
              const status = projectStatus?.videos?.[v.file]?.status || 'Waiting for Review';
              const bgColor = status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : status === 'Needs Changes' ? 'rgba(197, 160, 89, 0.1)' : 'rgba(239, 68, 68, 0.1)';
              return (
                <div key={`v-${i}`} style={{ 
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  padding: '10px 12px', backgroundColor: bgColor, borderRadius: '10px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: `3px solid ${getStatusColor(status)}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(0,0,0,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Film size={16} style={{ flexShrink: 0, color: getStatusColor(status) }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>{v.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600', padding: '3px 6px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.5)', color: getStatusColor(status), width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {getStatusIcon(status)}
                    {status}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', padding: '5px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '12px', width: 'fit-content', margin: '0 auto 30px', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.2)', border: '1px solid var(--color-border)' }}>
        <button 
          onClick={() => setActiveTab('albums')}
          style={{ 
            background: activeTab === 'albums' ? 'var(--color-gold)' : 'transparent', 
            border: 'none', 
            padding: '12px 35px', 
            cursor: 'pointer', 
            fontSize: '1.1rem',
            borderRadius: '8px',
            color: activeTab === 'albums' ? '#111' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'albums' ? '600' : '500',
            boxShadow: activeTab === 'albums' ? '0 2px 10px rgba(197, 160, 89, 0.3)' : 'none',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
        >
          Album Review
        </button>
        <button 
          onClick={() => setActiveTab('videos')}
          style={{ 
            background: activeTab === 'videos' ? 'var(--color-gold)' : 'transparent', 
            border: 'none', 
            padding: '12px 35px', 
            cursor: 'pointer', 
            fontSize: '1.1rem',
            borderRadius: '8px',
            color: activeTab === 'videos' ? '#111' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'videos' ? '600' : '500',
            boxShadow: activeTab === 'videos' ? '0 2px 10px rgba(197, 160, 89, 0.3)' : 'none',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
        >
          Video Review
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px' 
      }}>
        {activeTab === 'albums' && albums.map((album, index) => (
          <div key={index} className="glass-panel" style={{ 
            padding: '24px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '250px'
          }}>
            <AlbumThumbnail folderId={folderId} fileName={album.file} />
            <h3 style={{ fontSize: '1.4rem', marginBottom: '15px' }}>{album.title}</h3>
            <button className="btn-gold" onClick={() => handleOpenAlbum(album.file)} style={{ width: '100%' }}>
              Open Flipbook
            </button>
          </div>
        ))}

        {activeTab === 'videos' && videos.length === 0 && (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-muted)' }}>No videos available for review.</p>
        )}

        {activeTab === 'videos' && videos.map((video, index) => {
          const status = projectStatus?.videos?.[video.file]?.status || 'Waiting for Review';
          return (
            <div key={index} className="glass-panel" style={{ 
              padding: '24px', 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '250px'
            }}>
              <div 
                style={{ 
                  width: '100%', 
                  height: '160px', 
                  backgroundColor: '#111', 
                  borderRadius: '10px', 
                  marginBottom: '15px', 
                  overflow: 'hidden', 
                  position: 'relative', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }} 
                onClick={() => handleOpenVideo(video.file)}
              >
                <video 
                  src={`/api/video/stream/${folderId}/${encodeURIComponent(video.file)}#t=0.5`} 
                  preload="metadata" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ 
                  position: 'absolute', 
                  top: 0, left: 0, right: 0, bottom: 0, 
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4))', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'background 0.2s ease'
                }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(197, 160, 89, 0.9)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
                    paddingLeft: '3px' 
                  }}>
                    <Play size={22} color="#fff" fill="#fff" />
                  </div>
                </div>
              </div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '5px' }}>{video.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                {getStatusIcon(status)} {status}
              </p>
              <button className="btn-gold" onClick={() => handleOpenVideo(video.file)} style={{ width: '100%' }}>
                Review Video
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
