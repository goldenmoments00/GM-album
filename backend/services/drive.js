const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const possibleEnvPaths = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  path.join(process.cwd(), 'backend/.env'),
  path.join(process.cwd(), '.env')
];

for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    console.log('[GoogleDrive Init] Found .env at:', p);
    try {
      const envConfig = dotenv.parse(fs.readFileSync(p));
      for (const k in envConfig) {
        if (envConfig[k]) {
          process.env[k] = envConfig[k];
        }
      }
    } catch (e) {
      console.error('[GoogleDrive Init] Error parsing env file at', p, e);
    }
  }
}

// Initialize OAuth2 Client
let driveApi = null;
let auth = null;

try {
  const credentialsPath = path.join(__dirname, '../credentials.json');
  const tokenPath = path.join(__dirname, '../token.json');

  let credentials = null;
  let token = null;

  // 1. Load Credentials (either from ENV or File)
  if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
    console.log('[GoogleDrive Init] Loading credentials from Environment Variable');
    credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
  } else if (fs.existsSync(credentialsPath)) {
    console.log('[GoogleDrive Init] Loading credentials from', credentialsPath);
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  }

  // 2. Load Token (either from ENV or File)
  if (process.env.GOOGLE_DRIVE_TOKEN) {
    console.log('[GoogleDrive Init] Loading token from Environment Variable');
    token = JSON.parse(process.env.GOOGLE_DRIVE_TOKEN);
  } else if (fs.existsSync(tokenPath)) {
    console.log('[GoogleDrive Init] Loading token from', tokenPath);
    token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  }

  if (credentials && token) {
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web || credentials;
    const redirectUri = (redirect_uris && redirect_uris.length > 0) ? redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob';
    
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);
    oAuth2Client.setCredentials(token);
    
    auth = oAuth2Client;
    driveApi = google.drive({ version: 'v3', auth });
    console.log('[GoogleDrive Init] OAuth2 Client successfully initialized!');
  } else {
    console.error('[GoogleDrive Init] ERROR: Missing Google Drive Credentials or Token. Please set GOOGLE_DRIVE_CREDENTIALS and GOOGLE_DRIVE_TOKEN environment variables, or ensure credentials.json and token.json exist.');
  }
} catch (err) {
  console.error('[GoogleDrive Init] Failed to initialize OAuth2 client:', err);
}

const useMock = false;
const MOCK_DRIVE_PATH = '';


const getDriveRoot = () => {
  const root = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!root) {
    console.error('[GoogleDrive Error] DRIVE_ROOT_FOLDER_ID is missing or undefined!');
  }
  return root;
};

/**
 * Searches for a folder in Google Drive by its name (Album Password)
 * @param {string} folderName - The album password
 * @returns {string|null} - The folder ID or null if not found
 */
async function findFolderByName(folderName) {
  const cleanName = folderName.trim();
  
  if (useMock) {
    if (fs.existsSync(MOCK_DRIVE_PATH)) {
      const items = fs.readdirSync(MOCK_DRIVE_PATH);
      const match = items.find(item => 
        item.toLowerCase() === cleanName.toLowerCase() ||
        item.toLowerCase().startsWith(cleanName.toLowerCase() + " ")
      );
      if (match) {
        const folderPath = path.join(MOCK_DRIVE_PATH, match);
        if (fs.statSync(folderPath).isDirectory()) {
          return match;
        }
      }
    }
    return null;
  }

    // Strip any accidental quotes and provide a hardcoded fallback in case Vercel env is missing!
    const rootFolderId = (process.env.DRIVE_ROOT_FOLDER_ID || '1jnkps6an8eksyMu4TmC96QbXqX6l2xBi').replace(/^['"]|['"]$/g, '').trim();
    
    try {
      // 1. If rootFolderId is set, search inside parents first
      if (rootFolderId) {
        console.log(`[GoogleDrive] Searching in root folder ID: "${rootFolderId}" for album: "${cleanName}"`);
        const exactQuery = `name = '${cleanName}' and mimeType = 'application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed = false`;
        const res = await driveApi.files.list({
          q: exactQuery,
          fields: 'files(id, name)',
          spaces: 'drive',
        });

      if (res.data.files && res.data.files.length > 0) {
        console.log(`[GoogleDrive] Found folder "${cleanName}" in root parent:`, res.data.files[0].id);
        return res.data.files[0].id;
      }
    }

    // 2. Global search fallback across all shared/accessible folders
    const globalQuery = `name = '${cleanName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const globalRes = await driveApi.files.list({
      q: globalQuery,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (globalRes.data.files && globalRes.data.files.length > 0) {
      console.log(`[GoogleDrive] Found folder "${cleanName}" via global search:`, globalRes.data.files[0].id);
      return globalRes.data.files[0].id;
    }

    // 3. Global case-insensitive search fallback
    const listAllQuery = `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const allRes = await driveApi.files.list({
      q: listAllQuery,
      fields: 'files(id, name)',
      spaces: 'drive',
      pageSize: 100
    });

    if (allRes.data.files) {
      const matchedFolder = allRes.data.files.find(f => 
        f.name.toLowerCase() === cleanName.toLowerCase() ||
        f.name.toLowerCase().startsWith(cleanName.toLowerCase() + " ") ||
        f.name.toLowerCase().startsWith(cleanName.toLowerCase() + "-")
      );

      if (matchedFolder) {
        console.log(`[GoogleDrive] Found folder "${cleanName}" via case-insensitive search:`, matchedFolder.id);
        return matchedFolder.id;
      }
    }

    console.warn(`[GoogleDrive] No folder found matching "${cleanName}"`);
    return null;
  } catch (error) {
    console.error('Error finding Google Drive folder:', error.message || error);
    throw new Error('Failed to search Google Drive');
  }
}

/**
 * Gets all PDF albums in the specified folder
 * @param {string} folderId 
 * @returns {Array} - List of album objects {title, file}
 */
async function getAlbumsInFolder(folderId) {
  if (useMock) {
    const folderPath = path.join(MOCK_DRIVE_PATH, folderId);
    if (!fs.existsSync(folderPath)) {
      throw new Error('Folder not found in mock drive');
    }
    const files = fs.readdirSync(folderPath);
    const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    
    return pdfs.map(file => ({
      title: file.replace(/\.pdf$/i, ''),
      file: file
    }));
  }

  try {
    // Find all PDF files in the folder
    const query = `'${folderId}' in parents and mimeType = 'application/pdf' and trashed = false`;
    const res = await driveApi.files.list({
      q: query,
      fields: 'files(id, name)',
    });

    return res.data.files.map(file => ({
      title: file.name.replace(/\.pdf$/i, ''),
      file: file.name
    }));
  } catch (error) {
    console.error('Error getting albums:', error);
    throw new Error('Failed to read album files');
  }
}

/**
 * Streams a PDF file from Google Drive
 * @param {string} folderId - The ID of the album folder
 * @param {string} fileName - The name of the PDF file
 * @param {object} res - Express response object to pipe the stream to
 */
async function streamPdf(folderId, fileName, res, rangeHeader) {
  if (useMock) {
    const pdfPath = path.join(MOCK_DRIVE_PATH, folderId, fileName);
    if (fs.existsSync(pdfPath)) {
      // sendFile natively supports HTTP 206 Partial Content (Range Requests)
      // This allows PDF.js to instantly load thumbnails without downloading the whole file!
      res.sendFile(pdfPath);
      return;
    }
    res.status(404).send('PDF not found in mock drive');
    return;
  }

  try {
    // Find the PDF file by name in the folder
    const query = `name = '${fileName}' and '${folderId}' in parents and mimeType = 'application/pdf' and trashed = false`;
    const searchRes = await driveApi.files.list({
      q: query,
      fields: 'files(id, name, size)',
    });

    if (searchRes.data.files.length === 0) {
      res.status(404).json({ error: 'PDF file not found' });
      return;
    }

    const fileId = searchRes.data.files[0].id;
    
    const requestHeaders = {};
    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
    }

    // Stream the file with Range support
    const fileRes = await driveApi.files.get(
      { fileId: fileId, alt: 'media' },
      { headers: requestHeaders, responseType: 'stream' }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Proxy the Google Drive range headers back to the client
    if (fileRes.headers['content-range']) {
      res.status(206);
      res.setHeader('Content-Range', fileRes.headers['content-range']);
    }
    if (fileRes.headers['content-length']) {
      res.setHeader('Content-Length', fileRes.headers['content-length']);
    }

    fileRes.data
      .on('end', () => {})
      .on('error', (err) => {
        console.error('Error downloading file:', err);
        if (!res.headersSent) res.status(500).send('Error downloading file');
      })
      .pipe(res);

  } catch (error) {
    console.error('Error streaming PDF:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to stream PDF' });
  }
}

async function getVideosInFolder(folderId) {
  if (useMock) {
    const folderPath = path.join(MOCK_DRIVE_PATH, folderId);
    let videos = [];
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      videos = files.filter(f => f.toLowerCase().endsWith('.mp4') || f.toLowerCase().endsWith('.mov'));
    }
    
    // Also check Videos subfolder for backward compatibility in mock
    const videosPath = path.join(MOCK_DRIVE_PATH, folderId, 'Videos');
    if (fs.existsSync(videosPath)) {
      const subFiles = fs.readdirSync(videosPath);
      const subVideos = subFiles.filter(f => f.toLowerCase().endsWith('.mp4') || f.toLowerCase().endsWith('.mov'));
      videos = [...videos, ...subVideos];
    }
    
    return videos.map(file => ({
      title: file.replace(/\.(mp4|mov)$/i, ''),
      file: file
    }));
  }

  try {
    // Search directly in folderId (matching real Google Drive screenshot structure)
    const query = `'${folderId}' in parents and (mimeType = 'video/mp4' or mimeType = 'video/quicktime' or mimeType contains 'video/') and trashed = false`;
    
    const res = await driveApi.files.list({
      q: query,
      fields: 'files(id, name, thumbnailLink)',
    });

    return res.data.files.map(file => ({
      title: file.name.replace(/\.[^/.]+$/, ''), // remove any extension
      file: file.name,
      thumbnail: file.thumbnailLink || null
    }));
  } catch (error) {
    console.error('Error getting videos:', error);
    return [];
  }
}

async function streamVideo(folderId, fileName, res, rangeHeader) {
  if (useMock) {
    let videoPath = path.join(MOCK_DRIVE_PATH, folderId, fileName);
    if (!fs.existsSync(videoPath)) {
      videoPath = path.join(MOCK_DRIVE_PATH, folderId, 'Videos', fileName);
    }
    if (fs.existsSync(videoPath)) {
      res.sendFile(videoPath);
      return;
    }
    res.status(404).send('Video not found in mock drive');
    return;
  }

  try {
    // Find the video file by name directly in the folderId
    const query = `name = '${fileName}' and '${folderId}' in parents and (mimeType = 'video/mp4' or mimeType = 'video/quicktime' or mimeType contains 'video/') and trashed = false`;
    const searchRes = await driveApi.files.list({
      q: query,
      fields: 'files(id, name, size, mimeType)',
    });

    if (searchRes.data.files.length === 0) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    const fileId = searchRes.data.files[0].id;
    const fileSize = searchRes.data.files[0].size;
    const mimeType = searchRes.data.files[0].mimeType || 'video/mp4';
    
    const requestHeaders = {};
    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
    }

    const fileRes = await driveApi.files.get(
      { fileId: fileId, alt: 'media' },
      { headers: requestHeaders, responseType: 'stream' }
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    
    if (fileRes.status === 206 || fileRes.headers['content-range']) {
      res.status(206);
      res.setHeader('Content-Range', fileRes.headers['content-range']);
    }
    
    if (fileRes.headers['content-length']) {
      res.setHeader('Content-Length', fileRes.headers['content-length']);
    } else if (fileSize && !rangeHeader) {
      res.setHeader('Content-Length', fileSize);
    }

    fileRes.data
      .on('end', () => {})
      .on('error', (err) => {
        console.error('Error downloading video:', err);
        if (!res.headersSent) res.status(500).send('Error downloading video');
      })
      .pipe(res);

  } catch (error) {
    console.error('Error streaming video:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to stream video' });
  }
}

const { Readable } = require('stream');
const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

async function findOrCreateReviewsFolder(parentFolderId) {
  try {
    const query = `name = 'Reviews' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await driveApi.files.list({ q: query, fields: 'files(id, name)' });
    
    if (searchRes.data.files.length > 0) {
      return searchRes.data.files[0].id;
    }

    const fileMetadata = {
      name: 'Reviews',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    };
    const folder = await driveApi.files.create({
      resource: fileMetadata,
      fields: 'id',
      supportsAllDrives: true
    });
    return folder.data.id;
  } catch (error) {
    console.error('Error finding/creating Reviews folder:', error);
    throw error;
  }
}

async function createNewReviewFolder(reviewsFolderId) {
  try {
    const query = `'${reviewsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains 'Review-' and trashed = false`;
    const searchRes = await driveApi.files.list({ q: query, fields: 'files(name)' });
    
    let nextNum = 1;
    if (searchRes.data.files.length > 0) {
      const nums = searchRes.data.files.map(f => {
        const match = f.name.match(/Review-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    
    const folderName = `Review-${String(nextNum).padStart(3, '0')}`;
    
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [reviewsFolderId]
    };
    const folder = await driveApi.files.create({
      resource: fileMetadata,
      fields: 'id',
      supportsAllDrives: true
    });
    return { folderId: folder.data.id, reviewNumber: nextNum, folderName };
  } catch (error) {
    console.error('Error creating new Review folder:', error);
    throw error;
  }
}

async function uploadReviewAssets(targetFolderId, screenshotBuffer, voiceBuffer, options = {}) {
  try {
    let screenshotResult = null;
    if (screenshotBuffer) {
      const media = {
        mimeType: options.screenshotMimeType || 'image/png',
        body: bufferToStream(screenshotBuffer)
      };
      const fileMetadata = {
        name: options.screenshotName || 'screenshot.png',
        parents: [targetFolderId]
      };
      const file = await driveApi.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
        supportsAllDrives: true
      });
      // Share file publicly so it can be viewed directly
      await driveApi.permissions.create({
        fileId: file.data.id,
        resource: { role: 'reader', type: 'anyone' }
      });
      screenshotResult = file.data;
    }

    let voiceResult = null;
    if (voiceBuffer) {
      const media = {
        mimeType: options.voiceMimeType || 'audio/webm', 
        body: bufferToStream(voiceBuffer)
      };
      const fileMetadata = {
        name: options.voiceName || 'voice.webm',
        parents: [targetFolderId]
      };
      const file = await driveApi.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
        supportsAllDrives: true
      });
      // Share file publicly
      await driveApi.permissions.create({
        fileId: file.data.id,
        resource: { role: 'reader', type: 'anyone' }
      });
      voiceResult = file.data;
    }

    return { screenshot: screenshotResult, voice: voiceResult };
  } catch (error) {
    console.error('Error uploading review assets:', error);
    throw error;
  }
}

async function streamFileById(fileId, res, rangeHeader) {
  try {
    const requestHeaders = {};
    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
    }

    const fileRes = await driveApi.files.get(
      { fileId: fileId, alt: 'media' },
      { headers: requestHeaders, responseType: 'stream' }
    );

    res.setHeader('Accept-Ranges', 'bytes');
    
    if (fileRes.headers['content-type']) {
      res.setHeader('Content-Type', fileRes.headers['content-type']);
    }
    if (fileRes.headers['content-range']) {
      res.status(206);
      res.setHeader('Content-Range', fileRes.headers['content-range']);
    }
    if (fileRes.headers['content-length']) {
      res.setHeader('Content-Length', fileRes.headers['content-length']);
    }

    fileRes.data
      .on('end', () => {})
      .on('error', (err) => {
        console.error('Error downloading file:', err);
        if (!res.headersSent) res.status(500).send('Error downloading file');
      })
      .pipe(res);

  } catch (error) {
    console.error('Error streaming file by id:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to stream file' });
  }
}

async function uploadVideoVoiceNote(projectFolderId, voiceBuffer, mimeType = 'audio/mp4', extension = 'mp4') {
  try {
    // Find or create 'Video Comments' folder in projectFolderId
    const query = `name = 'Video Comments' and '${projectFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await driveApi.files.list({ q: query, fields: 'files(id)' });
    
    let videoCommentsFolderId;
    if (searchRes.data.files.length > 0) {
      videoCommentsFolderId = searchRes.data.files[0].id;
    } else {
      const folderMetadata = {
        name: 'Video Comments',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [projectFolderId]
      };
      const folder = await driveApi.files.create({
        resource: folderMetadata,
        fields: 'id',
        supportsAllDrives: true
      });
      videoCommentsFolderId = folder.data.id;
    }

    // Upload voice blob
    const media = {
      mimeType: mimeType,
      body: bufferToStream(voiceBuffer)
    };
    const fileMetadata = {
      name: `voice-${Date.now()}.${extension}`,
      parents: [videoCommentsFolderId]
    };
    
    const file = await driveApi.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true
    });

    // Share publicly
    await driveApi.permissions.create({
      fileId: file.data.id,
      resource: { role: 'reader', type: 'anyone' }
    });

    return file.data;
  } catch (error) {
    console.error('Error uploading video voice note:', error);
    throw error;
  }
}

module.exports = {
  findFolderByName,
  getAlbumsInFolder,
  streamPdf,
  getVideosInFolder,
  streamVideo,
  findOrCreateReviewsFolder,
  createNewReviewFolder,
  uploadReviewAssets,
  streamFileById,
  uploadVideoVoiceNote
};
