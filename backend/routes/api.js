const express = require('express');
const router = express.Router();
const driveService = require('../services/drive');
const dbService = require('../services/db');
const r2Service = require('../services/r2');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// In a real application, we might want to use JWTs or sessions, 
// but since this is a simple portal, the frontend can just keep the folder ID in memory
// after a successful login.

/**
 * POST /api/login
 * Body: { password: 'GM001' }
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    console.log(`[Login Request] Attempting login with password: "${password}"`);
    
    // First, try checking Firebase for an R2 project
    let project = await dbService.getProjectById(password);
    let folderId = null;
    let albums = [];
    let isR2 = false;

    if (project && project.source === 'r2') {
      console.log(`[Login Success] Found R2 project for password "${password}"`);
      folderId = project.id;
      isR2 = true;
      // Fetch albums from R2/Firebase
      const r2Albums = await dbService.getProjectFiles(folderId, 'albums');
      // Map to expected legacy structure { title, file, url }
      albums = r2Albums.map(a => ({
        title: a.title,
        file: a.name,
        url: a.url,
        isR2: true
      }));
    } else {
      // Fallback to legacy Google Drive
      folderId = await driveService.findFolderByName(password);
      
      if (!folderId) {
        console.warn(`[Login Failed] Folder ID not found for password: "${password}"`);
        return res.status(401).json({ error: 'Invalid Album Password' });
      }

      console.log(`[Login Success] Found Google Drive folder ID "${folderId}" for password "${password}"`);
      albums = await driveService.getAlbumsInFolder(folderId);
    }

    // Return the structure
    res.json({
      success: true,
      folderId: folderId,
      albumId: password,
      albums: albums,
      isR2: isR2,
      projectName: project ? project.name : password
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

/**
 * GET /api/album/:id
 * Fetch the album info if needed later
 */
router.get('/album/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    const albums = await driveService.getAlbumsInFolder(folderId);
    res.json({ albums: albums });
  } catch (error) {
    console.error('Album Info Error:', error);
    res.status(404).json({ error: 'Album not found' });
  }
});

/**
 * GET /api/pdf/:id/:file
 * Streams the PDF file
 */
router.get('/pdf/:id/:file', async (req, res) => {
  try {
    const folderId = req.params.id;
    const fileName = req.params.file;
    const rangeHeader = req.headers.range;
    
    // Check if it's an R2 project
    const project = await dbService.getProjectById(folderId);
    if (project && project.source === 'r2') {
      const r2Albums = await dbService.getProjectFiles(folderId, 'albums');
      const album = r2Albums.find(a => a.name === fileName);
      if (album && album.url) {
        return res.redirect(album.url);
      }
    }

    await driveService.streamPdf(folderId, fileName, res, rangeHeader);
  } catch (error) {
    console.error('PDF Stream Error:', error);
    res.status(500).json({ error: 'Failed to stream PDF' });
  }
});

/**
 * POST /api/feedback
 * Stub for future feedback implementation
 */
router.post('/feedback', async (req, res) => {
  try {
    const { folderId, pages, comment } = req.body;
    console.log(`[FEEDBACK] Album: ${folderId} | Pages: ${pages.join(',')} | Comment: ${comment}`);
    
    // TODO: Send email or write to Google Sheet
    
    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback Error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * GET /api/project-status/:id
 */
router.get('/project-status/:id', async (req, res) => {
  try {
    const status = await dbService.getProjectStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * GET /api/videos/:id
 */
router.get('/videos/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    // Check if it's an R2 project
    const project = await dbService.getProjectById(folderId);
    if (project && project.source === 'r2') {
      const r2Videos = await dbService.getProjectFiles(folderId, 'videos');
      const videos = r2Videos.map(v => ({
        title: v.title,
        file: v.name,
        url: v.url,
        isR2: true
      }));
      return res.json({ videos });
    }

    // Legacy Google Drive
    const videos = await driveService.getVideosInFolder(folderId);
    res.json({ videos });
  } catch (error) {
    console.error('Video Info Error:', error);
    res.status(404).json({ error: 'Videos not found' });
  }
});

/**
 * GET /api/video/stream/:id/:file
 */
router.get('/video/stream/:id/:file', async (req, res) => {
  try {
    const folderId = req.params.id;
    const fileName = req.params.file;
    const rangeHeader = req.headers.range;

    // Check if it's an R2 project
    const project = await dbService.getProjectById(folderId);
    if (project && project.source === 'r2') {
      const r2Videos = await dbService.getProjectFiles(folderId, 'videos');
      const video = r2Videos.find(v => v.name === fileName);
      if (video && video.url) {
        return res.redirect(video.url);
      }
    }

    await driveService.streamVideo(folderId, fileName, res, rangeHeader);
  } catch (error) {
    console.error('Video Stream Error:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

/**
 * GET /api/video/data/:id/:file
 */
router.get('/video/data/:id/:file', async (req, res) => {
  try {
    const data = await dbService.getVideoData(req.params.id, req.params.file);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get video data' });
  }
});

/**
 * POST /api/video/comment
 */
router.post('/video/comment', upload.fields([{ name: 'voice' }]), async (req, res) => {
  try {
    const { folderId, fileId, timestamp, commentText } = req.body;
    
    let voiceFileId = null;
    let voiceUrl = null;

    if (req.files && req.files['voice']) {
      const voiceBuffer = req.files['voice'][0].buffer;
      const voiceMimeType = req.files['voice'][0].mimetype || 'audio/mp4';
      let extension = 'mp4';
      if (req.files['voice'][0].originalname) {
         extension = req.files['voice'][0].originalname.split('.').pop();
      }
      const uploadedVoice = await driveService.uploadVideoVoiceNote(folderId, voiceBuffer, voiceMimeType, extension);
      voiceFileId = uploadedVoice.id;
      voiceUrl = uploadedVoice.webViewLink;
    }

    const comments = await dbService.addVideoComment(folderId, fileId, parseFloat(timestamp), commentText, voiceFileId, voiceUrl);
    res.json({ success: true, comments });
  } catch (err) {
    console.error('Failed to add comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * DELETE /api/video/comment
 */
router.delete('/video/comment', async (req, res) => {
  try {
    const { folderId, fileId, commentId } = req.body;
    const comments = await dbService.deleteVideoComment(folderId, fileId, commentId);
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

/**
 * POST /api/video/status
 */
router.post('/video/status', async (req, res) => {
  try {
    const { folderId, fileId, status } = req.body;
    const video = await dbService.updateVideoStatus(folderId, fileId, status);
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * POST /api/reviews/upload
 */
router.post('/reviews/upload', upload.fields([{ name: 'screenshot' }, { name: 'voice' }]), async (req, res) => {
  try {
    const { folderId, albumId, pageNumber, comment, createdBy } = req.body;
    
    // 1. Find or create the Reviews folder
    const reviewsFolderId = await driveService.findOrCreateReviewsFolder(folderId);
    
    // 2. Create the Review-XXX folder
    const { folderId: reviewFolderId, reviewNumber } = await driveService.createNewReviewFolder(reviewsFolderId);
    
    // 3. Upload assets
    const screenshotFile = req.files && req.files['screenshot'] ? req.files['screenshot'][0] : null;
    const voiceFile = req.files && req.files['voice'] ? req.files['voice'][0] : null;
    
    const screenshotBuffer = screenshotFile ? screenshotFile.buffer : null;
    const voiceBuffer = voiceFile ? voiceFile.buffer : null;
    
    const options = {
      screenshotMimeType: screenshotFile ? screenshotFile.mimetype : undefined,
      screenshotName: screenshotFile ? screenshotFile.originalname : undefined,
      voiceMimeType: voiceFile ? voiceFile.mimetype : undefined,
      voiceName: voiceFile ? voiceFile.originalname : undefined,
    };

    const assets = await driveService.uploadReviewAssets(reviewFolderId, screenshotBuffer, voiceBuffer, options);
    
    // 4. Save metadata to Firestore
    const reviewData = {
      albumId,
      projectFolderId: folderId,
      pageNumber: parseInt(pageNumber),
      googleDriveScreenshotFileId: assets.screenshot ? assets.screenshot.id : null,
      googleDriveVoiceFileId: assets.voice ? assets.voice.id : null,
      googleDriveScreenshotUrl: assets.screenshot ? assets.screenshot.webViewLink : null,
      googleDriveVoiceUrl: assets.voice ? assets.voice.webViewLink : null,
      comment: comment || '',
      status: 'Pending',
      createdBy: createdBy || 'Client',
      reviewNumber,
      updatedAt: new Date().toISOString()
    };
    
    const savedReview = await dbService.addAlbumReview(folderId, albumId, reviewData);
    
    res.json({ success: true, review: savedReview });
  } catch (err) {
    console.error('Review Upload Error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

/**
 * GET /api/reviews/:folderId/:albumId
 */
router.get('/reviews/:folderId/:albumId', async (req, res) => {
  try {
    const { folderId, albumId } = req.params;
    const reviews = await dbService.getAlbumReviews(folderId, albumId);
    res.json({ success: true, reviews });
  } catch (err) {
    console.error('Fetch Reviews Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * POST /api/reviews/status
 */
router.post('/reviews/status', async (req, res) => {
  try {
    const { folderId, albumId, reviewId, status } = req.body;
    await dbService.updateAlbumReviewStatus(folderId, albumId, reviewId, status);
    res.json({ success: true });
  } catch (err) {
    console.error('Update Review Status Error:', err);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

/**
 * DELETE /api/reviews
 */
router.delete('/reviews', async (req, res) => {
  try {
    const { folderId, albumId, reviewIds } = req.body;
    if (!Array.isArray(reviewIds)) {
      return res.status(400).json({ error: 'reviewIds must be an array' });
    }
    
    // Delete each review from the database
    for (const reviewId of reviewIds) {
      await dbService.deleteAlbumReview(folderId, albumId, reviewId);
    }
    
    res.json({ success: true, deletedCount: reviewIds.length });
  } catch (err) {
    console.error('Delete Reviews Error:', err);
    res.status(500).json({ error: 'Failed to delete reviews' });
  }
});

/**
 * GET /api/drive/file/:fileId
 * Generic endpoint to stream files (images, audio, etc) directly by fileId
 */
router.get('/drive/file/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const rangeHeader = req.headers.range;
    await driveService.streamFileById(fileId, res, rangeHeader);
  } catch (err) {
    console.error('File Stream Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to stream file' });
  }
});


// --- ADMIN API ROUTES ---

router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === (process.env.ADMIN_PASSWORD || 'admin123')) {
    res.json({ success: true, token: 'admin-token' });
  } else {
    res.status(401).json({ error: 'Invalid admin password' });
  }
});

router.get('/admin/projects', async (req, res) => {
  try {
    const projects = await dbService.getProjects();
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/projects', async (req, res) => {
  try {
    const { name, password } = req.body;
    const project = await dbService.createProject(name, password);
    res.json({ success: true, project });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/admin/upload-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    const urlData = await r2Service.generatePresignedUploadUrl(fileName, fileType);
    res.json(urlData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/finalize-upload', async (req, res) => {
  try {
    const { projectId, fileData } = req.body;
    const file = await dbService.addProjectFile(projectId, fileData);
    res.json({ success: true, file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/project/:id/files', async (req, res) => {
  try {
    const projectId = req.params.id;
    const albums = await dbService.getProjectFiles(projectId, 'albums');
    const videos = await dbService.getProjectFiles(projectId, 'videos');
    res.json({ success: true, albums, videos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
