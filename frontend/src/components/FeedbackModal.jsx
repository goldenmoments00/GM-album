import React, { useState, useRef } from 'react';
import { X, Send } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function FeedbackModal({ onClose, totalPages, folderId, fileId }) {
  const [pages, setPages] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const modalRef = useRef(null);
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pages || !comment) return;

    setSubmitting(true);
    try {
      // Still log to backend if needed
      await fetch('/api/feedback', {
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

      const text = `*Feedback for Album: ${fileId.replace(/\.pdf$/i, '')}*\nPages: ${pages}\n\nNotes:\n${comment}`;

      if (isMobile) {
        // Hide modal temporarily for screenshot
        if (modalRef.current) {
          modalRef.current.style.opacity = '0';
        }
        
        // Wait for rendering to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          const canvas = await html2canvas(document.body, { useCORS: true, logging: false });
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          
          // Download image
          const link = document.createElement('a');
          const filename = `Album_Changes_${fileId.replace(/\.pdf$/i, '')}.png`;
          link.download = filename;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          console.error("Screenshot failed", e);
        }
        
        // Show modal again
        if (modalRef.current) {
          modalRef.current.style.opacity = '1';
        }

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        
        setTimeout(() => {
          window.location.href = url;
          setSuccess(true);
          setTimeout(() => onClose(), 2000);
        }, 400);
      } else {
        navigator.clipboard.writeText(text).then(() => {
          setSuccess(true);
          setTimeout(() => onClose(), 2500);
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      ref={modalRef}
      style={{
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
            <h3 style={{ marginBottom: '10px' }}>{isMobile ? 'Redirecting to WhatsApp...' : 'Copied to Clipboard!'}</h3>
            <p>{isMobile ? 'Please send the message to the editor.' : 'Please paste the message in WhatsApp for the editor.'}</p>
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
              <Send size={18} /> {submitting ? 'Processing...' : (isMobile ? 'Send via WhatsApp' : 'Copy to Clipboard')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
