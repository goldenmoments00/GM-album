const { db } = require('./firebase');
const { doc, getDoc, setDoc, collection, getDocs } = require('firebase/firestore');

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

async function addVideoComment(folderId, fileName, timestamp, commentText) {
  if (!db) return [];
  
  try {
    const docRef = doc(db, 'projects', folderId, 'videos', fileName);
    const docSnap = await getDoc(docRef);
    
    const video = docSnap.exists() ? docSnap.data() : { status: 'Waiting for Review', comments: [] };
    
    const newComment = {
      id: Date.now().toString(),
      timestamp,
      text: commentText,
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

module.exports = {
  getVideoData,
  addVideoComment,
  updateVideoStatus,
  getProjectStatus
};
