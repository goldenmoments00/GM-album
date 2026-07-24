const { db } = require('./firebase');
const { doc, getDoc, setDoc, deleteDoc, collection, getDocs } = require('firebase/firestore');

async function getVideoData(folderId, fileName) {
  if (!db) {
    console.warn('[Firebase] Database not initialized');
    return { status: 'Waiting for Review', comments: [] };
  }
  
  try {
    const docRef = doc(db, 'projects', folderId, 'videos', fileName);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      const newData = { status: 'Waiting for Review', comments: [] };
      await setDoc(docRef, newData);
      return newData;
    }
    
    return docSnap.data();
  } catch (error) {
    console.error('Error in getVideoData:', error);
    return { status: 'Waiting for Review', comments: [] };
  }
}

async function createProject(projectName, password) {
  if (!db) throw new Error('[Firebase] Database not initialized');
  try {
    const projectId = password.trim(); // Using password as ID for simplicity, matching legacy behavior
    const docRef = doc(db, 'projects', projectId);
    
    // Check if project exists
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      throw new Error('Project with this password already exists');
    }

    const projectData = {
      id: projectId,
      name: projectName,
      password: password.trim(),
      createdAt: new Date().toISOString(),
      source: 'r2' // Distinguish from legacy Google Drive projects
    };

    await setDoc(docRef, projectData);
    return projectData;
  } catch (error) {
    console.error('Error in createProject:', error);
    throw error;
  }
}

async function getProjects() {
  if (!db) throw new Error('[Firebase] Database not initialized');
  try {
    const collRef = collection(db, 'projects');
    const snapshot = await getDocs(collRef);
    const projects = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.source === 'r2') {
        projects.push(data);
      }
    });
    
    return projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error in getProjects:', error);
    throw error;
  }
}

async function getProjectById(projectId) {
  if (!db) return null;
  try {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Error in getProjectById:', error);
    return null;
  }
}

async function addProjectFile(projectId, fileData) {
  if (!db) throw new Error('[Firebase] Database not initialized');
  try {
    // Determine collection based on file type (pdf -> albums, video -> videos)
    const collectionName = fileData.type === 'pdf' ? 'albums' : 'videos';
    
    // Use the file name as the document ID for consistency
    const fileId = fileData.name.replace(/\.[^/.]+$/, ""); // Remove extension for ID
    
    const docRef = doc(db, 'projects', projectId, collectionName, fileData.name);
    
    const newFile = {
      id: fileId,
      name: fileData.name,
      title: fileId,
      url: fileData.url, // Cloudflare R2 public URL
      type: fileData.type,
      size: fileData.size,
      status: 'Waiting for Review',
      comments: [],
      createdAt: new Date().toISOString()
    };
    
    await setDoc(docRef, newFile);
    return newFile;
  } catch (error) {
    console.error('Error in addProjectFile:', error);
    throw error;
  }
}

async function getProjectFiles(projectId, collectionName) {
  if (!db) return [];
  try {
    const collRef = collection(db, 'projects', projectId, collectionName);
    const snapshot = await getDocs(collRef);
    const files = [];
    snapshot.forEach(docSnap => {
      files.push(docSnap.data());
    });
    return files;
  } catch (error) {
    console.error(`Error in getProjectFiles (${collectionName}):`, error);
    return [];
  }
}

async function addVideoComment(folderId, fileName, timestamp, commentText, googleDriveVoiceFileId = null, googleDriveVoiceUrl = null) {
  if (!db) {
    console.warn('[Firebase] Database not initialized');
    return [];
  }
  
  try {
    const docRef = doc(db, 'projects', folderId, 'videos', fileName);
    const docSnap = await getDoc(docRef);
    
    const video = docSnap.exists() ? docSnap.data() : { status: 'Waiting for Review', comments: [] };
    
    const newComment = {
      id: Date.now().toString(),
      timestamp,
      text: commentText,
      googleDriveVoiceFileId,
      googleDriveVoiceUrl,
      createdAt: new Date().toISOString()
    };
    
    if (!video.comments) video.comments = [];
    video.comments.push(newComment);
    
    await setDoc(docRef, video, { merge: true });
    
    return video.comments;
  } catch (error) {
    console.error('Error in addVideoComment:', error);
    return [];
  }
}

async function deleteVideoComment(folderId, fileName, commentId) {
  if (!db) return [];
  
  try {
    const docRef = doc(db, 'projects', folderId, 'videos', fileName);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return [];
    
    const video = docSnap.data();
    if (!video.comments) return [];
    
    video.comments = video.comments.filter(c => c.id !== commentId);
    
    await setDoc(docRef, video, { merge: true });
    
    return video.comments;
  } catch (error) {
    console.error('Error in deleteVideoComment:', error);
    return [];
  }
}

async function updateVideoStatus(folderId, fileName, status) {
  if (!db) return { status, comments: [] };
  
  try {
    const docRef = doc(db, 'projects', folderId, 'videos', fileName);
    const docSnap = await getDoc(docRef);
    
    const video = docSnap.exists() ? docSnap.data() : { comments: [] };
    video.status = status;
    
    await setDoc(docRef, video, { merge: true });
    
    return video;
  } catch (error) {
    console.error('Error in updateVideoStatus:', error);
    return { status, comments: [] };
  }
}

async function getProjectStatus(folderId) {
  if (!db) return { videos: {}, albums: {} };
  
  try {
    const collRef = collection(db, 'projects', folderId, 'videos');
    const snapshot = await getDocs(collRef);
    const videos = {};
    
    snapshot.forEach(docSnap => {
      videos[docSnap.id] = docSnap.data();
    });
    
    return { videos, albums: {} };
  } catch (error) {
    console.error('Error in getProjectStatus:', error);
    return { videos: {}, albums: {} };
  }
}

async function addAlbumReview(folderId, albumId, reviewData) {
  if (!db) return null;
  
  try {
    // We store album reviews under projects/{folderId}/albums/{albumId}/reviews/{reviewId}
    const reviewId = reviewData.reviewId || Date.now().toString();
    const docRef = doc(db, 'projects', folderId, 'albums', albumId, 'reviews', reviewId);
    
    const docData = {
      ...reviewData,
      id: reviewId,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(docRef, docData);
    return docData;
  } catch (error) {
    console.error('Error in addAlbumReview:', error);
    throw error;
  }
}

async function getAlbumReviews(folderId, albumId) {
  if (!db) return [];
  
  try {
    const collRef = collection(db, 'projects', folderId, 'albums', albumId, 'reviews');
    const snapshot = await getDocs(collRef);
    const reviews = [];
    
    snapshot.forEach(docSnap => {
      reviews.push(docSnap.data());
    });
    
    // Sort by createdAt descending
    return reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error in getAlbumReviews:', error);
    return [];
  }
}

async function updateAlbumReviewStatus(folderId, albumId, reviewId, status) {
  if (!db) return null;
  
  try {
    const docRef = doc(db, 'projects', folderId, 'albums', albumId, 'reviews', reviewId);
    await setDoc(docRef, { status, updatedAt: new Date().toISOString() }, { merge: true });
    return { id: reviewId, status };
  } catch (error) {
    console.error('Error in updateAlbumReviewStatus:', error);
    throw error;
  }
}

async function deleteAlbumReview(folderId, albumId, reviewId) {
  if (!db) return false;
  
  try {
    const docRef = doc(db, 'projects', folderId, 'albums', albumId, 'reviews', reviewId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error in deleteAlbumReview:', error);
    throw error;
  }
}

module.exports = {
  getVideoData,
  addVideoComment,
  deleteVideoComment,
  updateVideoStatus,
  getProjectStatus,
  addAlbumReview,
  getAlbumReviews,
  updateAlbumReviewStatus,
  deleteAlbumReview,
  createProject,
  getProjects,
  getProjectById,
  addProjectFile,
  getProjectFiles
};
