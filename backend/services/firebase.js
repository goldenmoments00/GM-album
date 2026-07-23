const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;

try {
  // Allow user to use FIREBASE_CREDENTIALS_JSON string in Vercel
  if (process.env.FIREBASE_CREDENTIALS_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase] Initialized with FIREBASE_CREDENTIALS_JSON');
  } else {
    // Fallback to local JSON file
    const serviceAccountPath = path.join(__dirname, '../firebase-key.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[Firebase] Initialized with local firebase-key.json');
    } else {
      console.warn('[Firebase] Warning: firebase-key.json not found and FIREBASE_CREDENTIALS_JSON not set. Firestore will not work.');
    }
  }

  if (admin.apps.length > 0) {
    db = admin.firestore();
  }
} catch (error) {
  console.error('[Firebase] Initialization error:', error);
}

module.exports = { db, admin };
