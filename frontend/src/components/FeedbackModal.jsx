import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

export default function FeedbackModal({ onClose, totalPages, folderId, fileId }) {
  const [pages, setPages] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pages || !comment) return;

    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folderId,
          fileId,
          pages: pages.split(',').map(p => p.trim()),
          comment
        })
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '30px', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X size={24} color="var(--color-grey-dark)" />
        </button>

        <h2 style={{ marginBottom: '20px', color: 'var(--color-gold)' }}>Request Changes</h2>
        
        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'green' }}>
            <h3 style={{ marginBottom: '10px' }}>Feedback Submitted!</h3>
            <p>Our team will review your requests.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-grey-dark)' }}>
                Page Numbers (comma separated)
              </label>
              <input 
                type="text" 
                className="input-elegant" 
                placeholder="e.g. 4, 12, 15-18" 
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-grey-dark)' }}>
                Comments & Instructions
              </label>
              <textarea 
                className="input-elegant" 
                placeholder="Please describe the changes you'd like on these pages..."
                rows={5}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn-gold" disabled={submitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Send size={18} /> {submitting ? 'Submitting...' : 'Send Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
