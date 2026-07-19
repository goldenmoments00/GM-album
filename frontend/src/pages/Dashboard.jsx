import React from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumThumbnail from '../components/AlbumThumbnail';

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const { folderId, albumId, albums } = session;

  const handleOpenAlbum = (fileName) => {
    navigate(`/viewer/${encodeURIComponent(fileName)}`);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--color-gold)', marginBottom: '10px' }}>
          Album: {albumId}
        </h1>
        <p style={{ color: 'var(--color-grey-dark)', fontSize: '1.1rem' }}>
          Please review and approve your album designs below.
        </p>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px' 
      }}>
        {albums.map((album, index) => (
          <div key={index} className="glass-panel" style={{ 
            padding: '30px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '250px'
          }}>
            <AlbumThumbnail folderId={folderId} fileName={album.file} />
            
            <h3 style={{ fontSize: '1.4rem', marginBottom: '15px' }}>{album.title}</h3>
            
            <button 
              className="btn-gold" 
              onClick={() => handleOpenAlbum(album.file)}
              style={{ width: '100%' }}
            >
              Open Flipbook
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
