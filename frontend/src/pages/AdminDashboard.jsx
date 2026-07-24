import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, LogOut, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', password: '' });
  const [creating, setCreating] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Basic auth check
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }
    fetchProjects();
  }, [navigate]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/admin/projects');
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      const data = await res.json();
      if (data.success) {
        setShowNewModal(false);
        setNewProject({ name: '', password: '' });
        fetchProjects();
      } else {
        alert(data.error || 'Failed to create project');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating project');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}><Loader2 className="spin" size={32} /></div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', color: '#333' }}>Agent Portal</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setShowNewModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              <Plus size={18} /> New Project
            </button>
            <button 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {projects.map(project => (
            <div 
              key={project.id} 
              onClick={() => navigate(`/admin/project/${project.id}`)}
              style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ backgroundColor: '#e6f2ff', padding: '0.75rem', borderRadius: '8px', color: '#0070f3' }}>
                  <Folder size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1.25rem' }}>{project.name}</h3>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.875rem' }}>Password: {project.password}</p>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '8px', color: '#666' }}>
              No projects found. Create one to get started!
            </div>
          )}
        </div>

        {/* New Project Modal */}
        {showNewModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
              <h2 style={{ margin: '0 0 1.5rem 0' }}>Create New Project</h2>
              <form onSubmit={handleCreateProject}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Client / Project Name</label>
                  <input 
                    type="text" 
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    placeholder="e.g. John & Jane Wedding"
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Login Password (Unique ID)</label>
                  <input 
                    type="text" 
                    required
                    value={newProject.password}
                    onChange={(e) => setNewProject({...newProject, password: e.target.value})}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    placeholder="e.g. GM001"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowNewModal(false)}
                    style={{ padding: '0.5rem 1rem', border: '1px solid #ccc', backgroundColor: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={creating}
                    style={{ padding: '0.5rem 1rem', border: 'none', backgroundColor: '#0070f3', color: 'white', borderRadius: '4px', cursor: creating ? 'not-allowed' : 'pointer' }}
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
