const driveService = require('./services/drive');

async function test() {
  console.log('Testing drive initialization...');
  console.log('Credentials file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log('Root Folder ID:', process.env.DRIVE_ROOT_FOLDER_ID);
}
test();
