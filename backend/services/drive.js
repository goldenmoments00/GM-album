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

// Resolve service-account.json key path
const possibleKeyPaths = [
  path.join(__dirname, '../service-account.json'),
  path.join(process.cwd(), 'backend/service-account.json'),
  path.join(process.cwd(), 'service-account.json')
];

for (const kp of possibleKeyPaths) {
  if (fs.existsSync(kp)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = kp;
    break;
  }
}

console.log('[GoogleDrive Init] Credentials file resolved:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log('[GoogleDrive Init] Root folder ID resolved:', process.env.DRIVE_ROOT_FOLDER_ID);

// Helper to determine if we should use the mock drive for local testing
const useMock = (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) && 
                !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
                !process.env.GOOGLE_CREDENTIALS_JSON;
const MOCK_DRIVE_PATH = path.join(__dirname, '../../mock_drive');

let driveApi = null;

if (!useMock) {
  // Initialize Google Drive API
  let authOptions = {
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  };

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      console.log('[GoogleDrive Init] Using GOOGLE_CREDENTIALS_JSON string');
    } catch (e) {
      console.error('[GoogleDrive Init] Failed to parse GOOGLE_CREDENTIALS_JSON');
    }
  } else {
    authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    console.log('[GoogleDrive Init] Using keyFile path:', authOptions.keyFile);
  }

  const auth = new google.auth.GoogleAuth(authOptions);
  
  driveApi = google.drive({ version: 'v3', auth });
}

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

  const rootFolderId = process.env.DRIVE_ROOT_FOLDER_ID;
  
  try {
    // 1. If rootFolderId is set, search inside parents first
    if (rootFolderId) {
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
      fields: 'files(id, name)',
    });

    return res.data.files.map(file => ({
      title: file.name.replace(/\.[^/.]+$/, ''), // remove any extension
      file: file.name
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
      fields: 'files(id, name, size)',
    });

    if (searchRes.data.files.length === 0) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }

    const fileId = searchRes.data.files[0].id;
    const fileSize = searchRes.data.files[0].size;
    
    const requestHeaders = {};
    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
    }

    const fileRes = await driveApi.files.get(
      { fileId: fileId, alt: 'media' },
      { headers: requestHeaders, responseType: 'stream' }
    );

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    
    if (fileRes.headers['content-range']) {
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

module.exports = {
  findFolderByName,
  getAlbumsInFolder,
  streamPdf,
  getVideosInFolder,
  streamVideo
};
