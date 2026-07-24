import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumThumbnail from '../components/AlbumThumbnail';
import { Film, BookOpen, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Play, LogOut } from 'lucide-react';

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const { folderId, albumId, albums } = session;
  const [activeTab, setActiveTab] = useState('Album');
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

  const handleLogout = () => {
    localStorage.removeItem('savedPassword');
    window.location.href = '/login';
  };

  return (
    <div className="page-container" style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%', position: 'relative' }}>
      <button 
        onClick={handleLogout}
        className="btn-outline"
        style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '50%' }}
        title="Logout"
      >
        <LogOut size={18} />
      </button>

      <header style={{ textAlign: 'center', marginBottom: '40px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--color-primary)', marginBottom: '10px' }}>
          Project: {albumId}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
          Please review and approve your albums and videos below.
        </p>
      </header>

      {/* Progress Overview */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '15px', color: 'var(--color-primary)' }}>Progress Overview</h3>
        
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
            background: 'none', border: '1px solid rgba(139, 21, 26, 0.3)', 
            padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', 
            display: 'flex', alignItems: 'center', gap: '10px', 
            fontSize: '0.95rem', color: 'var(--color-primary)', fontWeight: '600', 
            width: '100%', justifyContent: 'space-between',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 21, 26, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {isOverviewExpanded ? 'Hide Detailed List' : 'View Detailed List'}
          {isOverviewExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {isOverviewExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
            {['Album', 'Full event video', 'Highlight video', 'Reels'].map(cat => {
              const catFiles = [...albums, ...videos].filter(f => {
                const fallbackCat = albums.includes(f) ? 'Album' : 'Full event video';
                return (f.category || fallbackCat) === cat;
              });
              if (catFiles.length === 0) return null;
              
              return (
                <div key={cat}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)', fontSize: '1.1rem' }}>{cat}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                    {catFiles.map((file, i) => {
                      const isAlbum = file.category === 'Album' || (!file.category && (albums.includes(file) || file.title.endsWith('.pdf')));
                      const status = isAlbum 
                        ? projectStatus?.albums?.[file.file]?.status || 'Waiting for Review'
                        : projectStatus?.videos?.[file.file]?.status || 'Waiting for Review';
                        
                      const bgColor = status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : status === 'Needs Changes' ? 'rgba(197, 160, 89, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                      
                      return (
                        <button key={`${cat}-${i}`} style={{ 
                          display: 'flex', flexDirection: 'column', gap: '8px',
                          padding: '10px 12px', backgroundColor: bgColor, borderRadius: '10px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderLeft: `3px solid ${getStatusColor(status)}`,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                          textAlign: 'inherit',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onClick={() => isAlbum ? handleOpenAlbum(file.file) : handleOpenVideo(file.file)}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(0,0,0,0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isAlbum ? <BookOpen size={16} style={{ flexShrink: 0, color: getStatusColor(status) }} /> : <Film size={16} style={{ flexShrink: 0, color: getStatusColor(status) }} />}
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>{file.title}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600', padding: '3px 6px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.5)', color: getStatusColor(status), width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {getStatusIcon(status)}
                            {status}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px', backgroundColor: '#ffffff', borderRadius: '9999px', width: 'fit-content', margin: '0 auto 30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)' }}>
        {['Album', 'Full event video', 'Highlight video', 'Reels'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              background: activeTab === tab ? 'rgba(139, 21, 26, 0.05)' : 'transparent', 
              border: activeTab === tab ? '1px solid var(--color-primary)' : '1px solid transparent', 
              padding: '10px 20px', 
              cursor: 'pointer', 
              fontSize: '0.95rem',
              borderRadius: '9999px',
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-primary)',
              fontWeight: activeTab === tab ? '700' : '600',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '6px',
              outline: 'none'
            }}
          >
            {tab === 'Album' ? <BookOpen size={16} /> : <Film size={16} />} {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px' 
      }}>
        {(() => {
          const catFiles = [...albums, ...videos].filter(f => {
            const fallbackCat = albums.includes(f) ? 'Album' : 'Full event video';
            return (f.category || fallbackCat) === activeTab;
          });
          
          if (catFiles.length === 0) {
            return (
              <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No files available for {activeTab}.
              </p>
            );
          }

          return catFiles.map((file, index) => {
            const isAlbum = file.category === 'Album' || (!file.category && (albums.includes(file) || file.title.endsWith('.pdf')));
            const status = isAlbum 
              ? projectStatus?.albums?.[file.file]?.status || 'Waiting for Review'
              : projectStatus?.videos?.[file.file]?.status || 'Waiting for Review';

            if (isAlbum) {
              return (
                <button key={index} style={{ 
                  display: 'flex', flexDirection: 'column', cursor: 'pointer', background: 'none',
                  border: 'none', padding: 0, textAlign: 'inherit', width: '100%'
                }} onClick={() => handleOpenAlbum(file.file)}>
                  <div style={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
                    <AlbumThumbnail folderId={folderId} fileName={file.file} />
                  </div>
                  <div style={{ marginTop: '15px', textAlign: 'left' }}>
                    <span style={{ color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {status}
                    </span>
                    <h3 style={{ fontSize: '1.4rem', margin: '5px 0 0 0', textTransform: 'uppercase', fontFamily: 'var(--font-heading)', color: 'var(--color-text-main)' }}>
                      {file.title}
                    </h3>
                  </div>
                </button>
              );
            }

            // Video item
            return (
              <button key={index} style={{ 
                display: 'flex', flexDirection: 'column', cursor: 'pointer', background: 'none',
                border: 'none', padding: 0, textAlign: 'inherit', width: '100%'
              }} onClick={() => handleOpenVideo(file.file)}>
                <div style={{ 
                  width: '100%', aspectRatio: '16/9', backgroundColor: '#111', 
                  borderRadius: '12px', overflow: 'hidden', position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ 
                    width: '100%', height: '100%', backgroundColor: '#8a1212',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)'
                  }}>
                    <h2 style={{ 
                      color: '#ffffff', fontFamily: 'var(--font-heading)', 
                      fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', textTransform: 'uppercase',
                      margin: 0, opacity: 0.95
                    }}>
                      {file.title}
                    </h2>
                  </div>
                  <div style={{ 
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.1)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s ease'
                  }}>
                    <div style={{ 
                      width: '60px', height: '60px', borderRadius: '50%', 
                      backgroundColor: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(4px)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', paddingLeft: '4px' 
                    }}>
                      <Play size={28} color="#fff" fill="#fff" />
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '15px', textAlign: 'left' }}>
                  <span style={{ color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {status}
                  </span>
                  <h3 style={{ fontSize: '1.4rem', margin: '5px 0 0 0', textTransform: 'uppercase', fontFamily: 'var(--font-heading)', color: 'var(--color-text-main)' }}>
                    {file.title}
                  </h3>
                </div>
              </button>
            );
          });
        })()}
      </div>
    </div>
  );
}
