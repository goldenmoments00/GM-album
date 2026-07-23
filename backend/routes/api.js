const express = require('express');
const router = express.Router();
const driveService = require('../services/drive');
const dbService = require('../services/db');
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

    console.log(`[Login Request] Attempting login with password/folder: "${password}"`);
    // Treat the password as the folder name
    const folderId = await driveService.findFolderByName(password);
    
    if (!folderId) {
      console.warn(`[Login Failed] Folder ID not found for password: "${password}"`);
      return res.status(401).json({ error: 'Invalid Album Password' });
    }

    console.log(`[Login Success] Found folder ID "${folderId}" for password "${password}"`);

    // Fetch the album PDFs directly from the folder
    const albums = await driveService.getAlbumsInFolder(folderId);

    // Return the new structure
    res.json({
      success: true,
      folderId: folderId,
      albumId: password,
      albums: albums
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
router.post('/video/comment', async (req, res) => {
  try {
    const { folderId, fileId, timestamp, commentText } = req.body;
    const comments = await dbService.addVideoComment(folderId, fileId, timestamp, commentText);
    res.json({ success: true, comments });
  } catch (err) {
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
    const screenshotBuffer = req.files && req.files['screenshot'] ? req.files['screenshot'][0].buffer : null;
    const voiceBuffer = req.files && req.files['voice'] ? req.files['voice'][0].buffer : null;
    
    const assets = await driveService.uploadReviewAssets(reviewFolderId, screenshotBuffer, voiceBuffer);
    
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

module.exports = router;
