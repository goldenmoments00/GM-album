const { db } = require('./firebase');

async function getVideoData(folderId, fileName) {
  if (!db) {
    console.warn('[Firebase] Database not initialized');
    return { status: 'Waiting for Review', comments: [] };
  }
  
  try {
    const docRef = db.collection('projects').doc(folderId).collection('videos').doc(fileName);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      const newData = { status: 'Waiting for Review', comments: [] };
      await docRef.set(newData);
      return newData;
    }
    
    return doc.data();
  } catch (error) {
    console.error('Error in getVideoData:', error);
    return { status: 'Waiting for Review', comments: [] };
  }
}

async function addVideoComment(folderId, fileName, timestamp, commentText) {
  if (!db) return [];
  
  try {
    const docRef = db.collection('projects').doc(folderId).collection('videos').doc(fileName);
    const doc = await docRef.get();
    
    const video = doc.exists ? doc.data() : { status: 'Waiting for Review', comments: [] };
    
    const newComment = {
      id: Date.now().toString(),
      timestamp,
      text: commentText,
      createdAt: new Date().toISOString()
    };
    
    if (!video.comments) video.comments = [];
    video.comments.push(newComment);
    
    await docRef.set(video, { merge: true });
    
    return video.comments;
  } catch (error) {
    console.error('Error in addVideoComment:', error);
    return [];
  }
}

async function updateVideoStatus(folderId, fileName, status) {
  if (!db) return { status, comments: [] };
  
  try {
    const docRef = db.collection('projects').doc(folderId).collection('videos').doc(fileName);
    const doc = await docRef.get();
    
    const video = doc.exists ? doc.data() : { comments: [] };
    video.status = status;
    
    await docRef.set(video, { merge: true });
    
    return video;
  } catch (error) {
    console.error('Error in updateVideoStatus:', error);
    return { status, comments: [] };
  }
}

async function getProjectStatus(folderId) {
  if (!db) return { videos: {}, albums: {} };
  
  try {
    const snapshot = await db.collection('projects').doc(folderId).collection('videos').get();
    const videos = {};
    
    snapshot.forEach(doc => {
      videos[doc.id] = doc.data();
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
