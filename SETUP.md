# GoldenMoment Portal Setup Guide

This guide explains how to set up the backend with Google Drive using a Service Account, and how to deploy the application.

## 1. Google Cloud Service Account Setup

Since this application uses Google Drive without a traditional database, it relies on a Service Account to read folders and files securely.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Project (e.g., "GoldenMoment Albums").
3. Go to **APIs & Services > Library** and enable the **Google Drive API**.
4. Go to **IAM & Admin > Service Accounts** and create a new Service Account.
5. Under the Service Account details, go to **Keys > Add Key > Create new key**, select **JSON**, and download the file.
6. **Important**: Note the email address of the Service Account (it looks like `service-name@project-id.iam.gserviceaccount.com`).

## 2. Google Drive Setup

1. Create a root folder in your personal or company Google Drive (e.g., "Client Albums").
2. Get the **Folder ID** from the URL of this root folder (e.g., `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`).
3. Share this root folder with the Service Account email you noted earlier, granting it **Viewer** access.

## 3. Environment Variables

Create a `.env` file in the `backend` folder with the following contents:

```env
PORT=3000

# The path to your Service Account JSON file
GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"

# The ID of the root folder containing all album folders
DRIVE_ROOT_FOLDER_ID="your-root-folder-id-here"
```

*Note: For production environments (like Render/Railway), you may need to pass the JSON content directly as an environment variable or use the platform's secret file management.*

## 4. Running Locally

### Backend
1. Open a terminal in the `backend` folder.
2. Run `npm install`.
3. Run `node server.js` (or use nodemon).

### Frontend
1. Open a terminal in the `frontend` folder.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:5173` in your browser.

## 5. Mock Drive (For Testing Without Credentials)

If you do not set `GOOGLE_APPLICATION_CREDENTIALS` in the backend, the server will automatically use the `mock_drive` folder for testing. 
You can create a folder named `GM001` inside `mock_drive`, add an `info.json` and a `Bride Album.pdf`, and log in with the password `GM001` on the frontend.
