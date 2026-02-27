const express = require('express');
const router = express.Router();
const {
  uploadMiddleware,
  uploadFile,
  getFileMetadata,
  downloadFile,
} = require('../Controllers/fileController');

/**
 * POST /api/files
 * Upload an encrypted file.
 * Multipart: encryptedFile, iv, fileName, expiry, maxDownloads, mimeType
 */
router.post('/', uploadMiddleware, uploadFile);

/**
 * GET /api/files/:id
 * Get file metadata: fileName, iv, storageUrl, fileSize, expiresAt, downloadsRemaining
 */
router.get('/:id', getFileMetadata);

/**
 * GET /api/files/:id/download
 * Stream the raw encrypted file bytes.
 * Client decrypts in browser using the IV + key (key never reaches server).
 */
router.get('/:id/download', downloadFile);

module.exports = router;