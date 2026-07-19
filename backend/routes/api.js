const express = require('express');
const router = express.Router();
const driveService = require('../services/drive');

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

    // Treat the password as the folder name
    const folderId = await driveService.findFolderByName(password);
    
    if (!folderId) {
      return res.status(401).json({ error: 'Invalid Album Password' });
    }

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

module.exports = router;
