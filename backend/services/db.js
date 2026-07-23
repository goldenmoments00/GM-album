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

module.exports = {
  getVideoData,
  addVideoComment,
  deleteVideoComment,
  updateVideoStatus,
  getProjectStatus,
  addAlbumReview,
  getAlbumReviews,
  updateAlbumReviewStatus
};
