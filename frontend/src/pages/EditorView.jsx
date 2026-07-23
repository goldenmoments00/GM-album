import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Maximize2, Clock, CheckCircle, AlertCircle, Play, Square as StopSquare, Trash2 } from 'lucide-react';

export default function EditorView() {
  const { folderId, albumId } = useParams();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState(null);
  const [selectedReviews, setSelectedReviews] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReviews = async () => {
    try {
      const cleanAlbumId = albumId.replace(/\.pdf$/i, '');
      const response = await fetch(`/api/reviews/${folderId}/${cleanAlbumId}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    const interval = setInterval(fetchReviews, 5000); // Polling every 5s for near real-time sync
    return () => clearInterval(interval);
  }, [folderId, albumId]);

  const handleStatusChange = async (reviewId, newStatus) => {
    try {
      // Optimistic update
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: newStatus } : r));
      
      const cleanAlbumId = albumId.replace(/\.pdf$/i, '');
      await fetch('/api/reviews/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, albumId: cleanAlbumId, reviewId, status: newStatus })
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      console.error('Failed to update status:', err);
      fetchReviews(); // Revert on failure
    }
  };

  const toggleSelectReview = (reviewId) => {
    const newSelected = new Set(selectedReviews);
    if (newSelected.has(reviewId)) {
      newSelected.delete(reviewId);
    } else {
      newSelected.add(reviewId);
    }
    setSelectedReviews(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedReviews.size === reviews.length && reviews.length > 0) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r.id)));
    }
  };

  const deleteReviews = async (reviewIds) => {
    if (!window.confirm(`Are you sure you want to delete ${reviewIds.length} review(s)? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const cleanAlbumId = albumId.replace(/\.pdf$/i, '');
      const response = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, albumId: cleanAlbumId, reviewIds })
      });

      if (response.ok) {
        setReviews(prev => prev.filter(r => !reviewIds.includes(r.id)));
        setSelectedReviews(new Set());
      } else {
        alert('Failed to delete reviews.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete reviews.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Completed') return '#22c55e'; // Green
    if (status === 'In Progress') return '#eab308'; // Gold
    return '#ff4444'; // Red (Pending)
  };

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', color: 'white', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px', cursor: 'pointer', fontSize: '1rem' }}
        >
          <ChevronLeft size={20} /> Back to Dashboard
        </button>

        <h1 style={{ fontSize: '2.5rem', color: 'var(--color-primary)', marginBottom: '30px' }}>
          Editor Dashboard
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '50px' }}>Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', backgroundColor: '#1a1a1a', padding: '50px', borderRadius: '12px', color: '#888' }}>
            No reviews submitted for this album yet.
          </div>
        ) : (
          <>
            {/* Bulk Actions Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a1a', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  checked={reviews.length > 0 && selectedReviews.size === reviews.length}
                  onChange={toggleSelectAll}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '500' }}>
                  {selectedReviews.size > 0 ? `${selectedReviews.size} Selected` : 'Select All'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedReviews.size > 0 && (
                  <button 
                    onClick={() => deleteReviews(Array.from(selectedReviews))}
                    disabled={isDeleting}
                    style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
                  >
                    <Trash2 size={16} /> Delete Selected
                  </button>
                )}
                <button 
                  onClick={() => deleteReviews(reviews.map(r => r.id))}
                  disabled={isDeleting}
                  style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
                >
                  <Trash2 size={16} /> Delete All
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {reviews.map((review) => (
              <div key={review.id} style={{ 
                backgroundColor: '#1a1a1a', borderRadius: '12px', border: `1px solid ${getStatusColor(review.status)}55`,
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: selectedReviews.has(review.id) ? '0 0 0 2px var(--color-primary)' : 'none',
                transition: 'box-shadow 0.2s ease'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #333', backgroundColor: '#222' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedReviews.has(review.id)}
                      onChange={() => toggleSelectReview(review.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Page {review.pageNumber} <span style={{ color: '#888', fontSize: '0.9rem', marginLeft: '5px' }}>#{review.reviewNumber}</span>
                    </div>
                  </div>
                  
                  <select 
                    value={review.status || 'Pending'}
                    onChange={(e) => handleStatusChange(review.id, e.target.value)}
                    style={{ 
                      backgroundColor: getStatusColor(review.status) + '22',
                      color: getStatusColor(review.status),
                      border: `1px solid ${getStatusColor(review.status)}`,
                      padding: '5px 10px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', outline: 'none'
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Screenshot Thumbnail */}
                <div 
                  style={{ height: '200px', backgroundColor: '#000', position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
                  onClick={() => setExpandedImage(review.googleDriveScreenshotFileId ? `/api/drive/file/${review.googleDriveScreenshotFileId}` : null)}
                >
                  {review.googleDriveScreenshotFileId ? (
                    <img 
                      src={`/api/drive/file/${review.googleDriveScreenshotFileId}`} 
                      alt="Review Screenshot" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#555' }}>No Screenshot</div>
                  )}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '5px' }}>
                    <Maximize2 size={16} color="white" />
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                  
                  {review.comment && (
                    <div style={{ backgroundColor: '#222', padding: '10px', borderRadius: '8px', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                      {review.comment}
                    </div>
                  )}

                  {review.googleDriveVoiceFileId && (
                    <div style={{ borderTop: '1px solid #333', paddingTop: '15px' }}>
                      <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '5px', fontWeight: 'bold' }}>Voice Note:</p>
                      <audio src={`/api/drive/file/${review.googleDriveVoiceFileId}`} controls style={{ width: '100%', height: '40px' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#666', marginTop: 'auto' }}>
                    <Clock size={12} /> 
                    {new Date(review.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          onClick={() => setExpandedImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 100000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
          }}
        >
          <img 
            src={expandedImage} 
            alt="Expanded Screenshot" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
          />
        </div>
      )}
    </div>
  );
}
