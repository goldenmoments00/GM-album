import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, File, Video, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminProjectView() {
  const { id } = useParams(); // This is the projectId / password
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState({ albums: [], videos: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // 'idle', 'uploading', 'success', 'error'
  const [currentUploadText, setCurrentUploadText] = useState('');
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`/api/admin/project/${id}/files`);
      const data = await res.json();
      if (data.success) {
        setFiles({ albums: data.albums || [], videos: data.videos || [] });
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

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
      
    fetchFiles();
  }, [id, navigate]);

  const handleFileUpload = async (e) => {
    const filesList = Array.from(e.target.files);
    if (!filesList.length) return;

    setUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    let hasError = false;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];

      // Must be PDF or MP4
      if (file.type !== 'application/pdf' && !file.type.startsWith('video/')) {
        alert(`Skipping ${file.name}: Please upload only PDF or Video files.`);
        continue;
      }

      setCurrentUploadText(`Uploading ${file.name} (${i + 1} of ${filesList.length})...`);
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
        
        if (!finalizeData.success) {
          throw new Error('Database finalization failed');
        }
        
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        hasError = true;
      }
    }

    if (hasError) {
      setUploadStatus('error');
    } else {
      setUploadStatus('success');
    }
    
    setUploading(false);
    fetchFiles(); // Refresh the list of files
    if (fileInputRef.current) fileInputRef.current.value = '';
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
              multiple
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
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{currentUploadText || 'Uploading to Cloudflare R2...'}</h3>
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

        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#333', margin: '0 0 1rem 0' }}>Uploaded Files</h2>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {files.albums.length === 0 && files.videos.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#666' }}>No files uploaded to this project yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[...files.albums, ...files.videos].map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #eee' }}>
                    <div style={{ marginRight: '1rem', color: '#0070f3', backgroundColor: '#f0f7ff', padding: '0.5rem', borderRadius: '8px' }}>
                      {file.type === 'pdf' ? <File size={24} /> : <Video size={24} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, color: '#333', fontSize: '1.1rem' }}>{file.name}</h4>
                      <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
                        Uploaded: {new Date(file.createdAt).toLocaleString()} &bull; {(file.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                    <div style={{ marginLeft: '1rem' }}>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', color: '#333', textDecoration: 'none', borderRadius: '4px', fontSize: '0.875rem', fontWeight: '500', transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#e5e5e5'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
