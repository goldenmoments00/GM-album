import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, File, Video, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminProjectView() {
  const { id } = useParams(); // This is the projectId / password
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // 'idle', 'uploading', 'success', 'error'
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Basic auth check
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin');
      return;
    }
    // We fetch projects to find this specific one (in a real app we'd have a specific GET /project/:id route)
    fetch('/api/admin/projects')
      .then(res => res.json())
      .then(data => {
        if (data.projects) {
          const p = data.projects.find(proj => proj.id === id);
          if (p) setProject(p);
        }
        setLoading(false);
      });
  }, [id, navigate]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Must be PDF or MP4
    if (file.type !== 'application/pdf' && !file.type.startsWith('video/')) {
      alert('Please upload only PDF or Video files.');
      return;
    }

    setUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // 1. Get Presigned URL from Backend
      const typeStr = file.type === 'application/pdf' ? 'pdf' : 'video';
      
      const urlRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type })
      });
      
      const { uploadUrl, key, publicUrl } = await urlRes.json();
      
      if (!uploadUrl) throw new Error('Failed to get upload URL');

      // 2. Upload file directly to Cloudflare R2 using XMLHttpRequest to track progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(Math.round(percentComplete));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        
        xhr.send(file);
      });

      // 3. Finalize: Tell backend the upload was successful so it saves to Database
      const finalizeRes = await fetch('/api/admin/finalize-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          fileData: {
            name: file.name,
            type: typeStr,
            url: publicUrl,
            size: file.size
          }
        })
      });

      const finalizeData = await finalizeRes.json();
      
      if (finalizeData.success) {
        setUploadStatus('success');
      } else {
        throw new Error('Database finalization failed');
      }
      
    } catch (err) {
      console.error(err);
      setUploadStatus('error');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 className="spin" size={32} /></div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <button 
          onClick={() => navigate('/admin/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginBottom: '2rem', padding: 0 }}
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{project.name}</h1>
          <p style={{ margin: '0 0 2rem 0', color: '#666' }}>Client Password: <strong>{project.password}</strong></p>

          <div style={{ border: '2px dashed #ccc', borderRadius: '8px', padding: '3rem 2rem', textAlign: 'center', backgroundColor: '#fafafa', position: 'relative' }}>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="application/pdf, video/*"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: uploading ? 'not-allowed' : 'pointer' }}
              disabled={uploading}
            />
            
            {!uploading && uploadStatus !== 'success' && uploadStatus !== 'error' && (
              <>
                <Upload size={48} color="#999" style={{ marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Click or drag a file to upload</h3>
                <p style={{ margin: 0, color: '#666' }}>Supports large PDF albums and MP4 videos.</p>
              </>
            )}

            {uploading && (
              <div>
                <Loader2 size={48} color="#0070f3" className="spin" style={{ marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Uploading directly to Cloudflare R2...</h3>
                <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '4px', height: '8px', overflow: 'hidden', marginTop: '1rem' }}>
                  <div style={{ width: `${uploadProgress}%`, backgroundColor: '#0070f3', height: '100%', transition: 'width 0.2s' }}></div>
                </div>
                <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.875rem' }}>{uploadProgress}%</p>
              </div>
            )}

            {uploadStatus === 'success' && !uploading && (
              <div>
                <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>Upload Complete!</h3>
                <p style={{ margin: 0, color: '#666' }}>The file is now securely hosted and attached to the project.</p>
                <button 
                  onClick={() => setUploadStatus('idle')}
                  style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Upload another file
                </button>
              </div>
            )}

            {uploadStatus === 'error' && !uploading && (
              <div>
                <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#ef4444' }}>Upload Failed</h3>
                <button 
                  onClick={() => setUploadStatus('idle')}
                  style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff9c4', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #fbc02d', color: '#666', fontSize: '0.875rem' }}>
          <strong>Note:</strong> Files uploaded here go directly to Cloudflare R2, completely bypassing Vercel. This guarantees 100% free bandwidth and no timeouts, even for 500MB+ files.
        </div>
      </div>
    </div>
  );
}
