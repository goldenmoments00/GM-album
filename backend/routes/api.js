const express = require('express');
const router = express.Router();
const driveService = require('../services/drive');
const dbService = require('../services/db');

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
router.get('/project-status/:id', (req, res) => {
  try {
    res.json(dbService.getProjectStatus(req.params.id));
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
router.get('/video/data/:id/:file', (req, res) => {
  try {
    const data = dbService.getVideoData(req.params.id, req.params.file);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get video data' });
  }
});

/**
 * POST /api/video/comment
 */
router.post('/video/comment', (req, res) => {
  try {
    const { folderId, fileId, timestamp, commentText } = req.body;
    const comments = dbService.addVideoComment(folderId, fileId, timestamp, commentText);
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * POST /api/video/status
 */
router.post('/video/status', (req, res) => {
  try {
    const { folderId, fileId, status } = req.body;
    const video = dbService.updateVideoStatus(folderId, fileId, status);
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
