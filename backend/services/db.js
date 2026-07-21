const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

// Initialize DB if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ projects: {} }, null, 2));
}

function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { projects: {} };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

function getProject(folderId) {
  const db = readDB();
  if (!db.projects[folderId]) {
    db.projects[folderId] = {
      videos: {},
      albums: {}
    };
    writeDB(db);
  }
  return db.projects[folderId];
}

function getVideoData(folderId, fileName) {
  const project = getProject(folderId);
  if (!project.videos[fileName]) {
    project.videos[fileName] = {
      status: 'Waiting for Review',
      comments: []
    };
    const db = readDB();
    db.projects[folderId] = project;
    writeDB(db);
  }
  return project.videos[fileName];
}

function addVideoComment(folderId, fileName, timestamp, commentText) {
  const db = readDB();
  const project = db.projects[folderId] || { videos: {}, albums: {} };
  const video = project.videos[fileName] || { status: 'Waiting for Review', comments: [] };
  
  video.comments.push({
    id: Date.now().toString(),
    timestamp,
    text: commentText,
    createdAt: new Date().toISOString()
  });
  
  project.videos[fileName] = video;
  db.projects[folderId] = project;
  writeDB(db);
  
  return video.comments;
}

function updateVideoStatus(folderId, fileName, status) {
  const db = readDB();
  const project = db.projects[folderId] || { videos: {}, albums: {} };
  const video = project.videos[fileName] || { status: 'Waiting for Review', comments: [] };
  
  video.status = status;
  
  project.videos[fileName] = video;
  db.projects[folderId] = project;
  writeDB(db);
  
  return video;
}

function getProjectStatus(folderId) {
  return getProject(folderId);
}

module.exports = {
  getVideoData,
  addVideoComment,
  updateVideoStatus,
  getProjectStatus
};
