import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());

// Configure multer to store files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 } // 40MB limit
});

// Configure Google Drive API Client using OAuth2 (Personal Gmail Quota)
const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

auth.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: 'v3', auth });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  console.log(`[BACKEND] Received upload request to /api/upload...`);

  try {
    if (!req.file) {
      console.error(`[BACKEND] Error: No file found in request payload.`);
      return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
    }

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;

    console.log(`[BACKEND] Successfully parsed file payload in memory: ${fileName} (${mimeType})`);

    // Create a readable stream from the buffer for Google Drive API
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId || folderId === 'your-google-drive-folder-id') {
      console.log(`[BACKEND] WARNING: GOOGLE_DRIVE_FOLDER_ID is invalid or missing in server/.env. Uploading to root of Service Account instead! You will not see this file in your personal Drive!`);
    } else {
      console.log(`[BACKEND] Attempting to stream file directly to Google Drive Folder: ${folderId}...`);
    }

    // Upload to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId && folderId !== 'your-google-drive-folder-id' ? [folderId] : undefined,
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink'
    });

    console.log(`[BACKEND] SUCCESS: Google Drive API accepted the file. File ID: ${response.data.id}`);

    res.status(200).json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    console.error('[BACKEND] Error uploading to Google Drive:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Express server running on http://localhost:${port}`);
});
