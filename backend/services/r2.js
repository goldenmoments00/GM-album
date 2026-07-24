const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const dotenv = require('dotenv');
dotenv.config();

// Initialize the S3 client to point to Cloudflare R2
let s3Client = null;

try {
  if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    console.log('[Cloudflare R2] Successfully initialized S3 client');
  } else {
    console.warn('[Cloudflare R2] Missing R2 credentials in environment variables.');
  }
} catch (error) {
  console.error('[Cloudflare R2] Initialization error:', error);
}

/**
 * Generates a presigned URL that the frontend can use to upload directly to R2.
 * @param {string} fileName The name of the file to be uploaded.
 * @param {string} contentType The MIME type of the file.
 * @param {string} projectId The project ID.
 * @param {string} category The category of the file (e.g., 'Album', 'Reels').
 * @returns {Promise<{url: string, key: string}>}
 */
async function generatePresignedUploadUrl(fileName, contentType, projectId = 'uploads', category = 'general') {
  if (!s3Client) {
    throw new Error('R2 Client is not configured. Missing environment variables.');
  }

  const bucketName = process.env.R2_BUCKET_NAME || 'golden-moments';
  
  // Create a unique key (path) for the file in the bucket to prevent overwriting
  const fileExtension = fileName.split('.').pop();
  const safeCategory = category.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueKey = `projects/${projectId}/${safeCategory}/${Date.now()}-${safeFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueKey,
    ContentType: contentType,
  });

  // URL expires in 1 hour (3600 seconds)
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    uploadUrl: presignedUrl,
    key: uniqueKey, // This is the path the file will be saved to in R2
    publicUrl: `${process.env.R2_PUBLIC_DOMAIN || 'YOUR_R2_DEV_DOMAIN'}/${uniqueKey}` 
  };
}

async function uploadBuffer(buffer, mimeType, fileName) {
  if (!s3Client) {
    throw new Error('R2 Client is not configured.');
  }

  const bucketName = process.env.R2_BUCKET_NAME || 'golden-moments';
  
  // Create a unique key inside a 'feedback' folder
  const fileExtension = fileName.split('.').pop() || 'bin';
  const uniqueKey = `feedback/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueKey,
    ContentType: mimeType,
    Body: buffer,
  });

  await s3Client.send(command);

  return {
    url: `${process.env.R2_PUBLIC_DOMAIN || 'YOUR_R2_DEV_DOMAIN'}/${uniqueKey}`,
    key: uniqueKey
  };
}

module.exports = {
  generatePresignedUploadUrl,
  uploadBuffer,
  isConfigured: () => s3Client !== null
};
