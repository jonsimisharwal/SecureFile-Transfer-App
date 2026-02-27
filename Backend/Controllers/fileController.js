const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const File = require('../models/File');
const { uploadToGridFS, streamFromGridFS, deleteFromGridFS } = require('../services/storageService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const uploadMiddleware = upload.single('encryptedFile');

async function uploadFile(req, res) {
  try {
    const { fileName, expiry, maxDownloads, mimeType } = req.body;
    const iv = req.body.iv || 'packed';

    if (!req.file) return res.status(400).json({ error: 'No encrypted file provided.' });
    if (!fileName || !fileName.trim()) return res.status(400).json({ error: 'fileName is required.' });

    // expiry is in hours (can be float e.g. 0.0167 = 1 minute, 0.000278 = 1 second)
    const expiryHours = parseFloat(expiry);
    if (isNaN(expiryHours) || expiryHours <= 0 || expiryHours > 720) {
      return res.status(400).json({ error: 'expiry must be between 1 second and 30 days.' });
    }

    const maxDl = parseInt(maxDownloads, 10) || 1;
    if (maxDl < 1 || maxDl > 100) return res.status(400).json({ error: 'maxDownloads must be 1–100.' });

    const safeMime = mimeType || req.file.mimetype || 'application/octet-stream';
    const gridfsId = await uploadToGridFS(req.file.buffer, fileName.trim(), safeMime);

    const fileId = uuidv4();
    // Convert hours to milliseconds precisely (supports seconds-level expiry)
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await File.create({
      fileId,
      fileName: fileName.trim(),
      iv,
      gridfsId,
      fileSize: req.file.size,
      mimeType: safeMime,
      expiresAt,
      downloadCount: 0,
      maxDownloads: maxDl,
    });

    console.log(`✅ Uploaded: ${fileName} | expires: ${expiresAt.toISOString()} | maxDl: ${maxDl}`);
    return res.status(201).json({ fileId });

  } catch (err) {
    console.error('uploadFile error:', err);
    return res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
}

async function getFileMetadata(req, res) {
  try {
    const { id } = req.params;
    const file = await File.findOne({ fileId: id });

    if (!file) return res.status(404).json({ error: 'File not found.' });
    if (file.expiresAt < new Date()) {
      await deleteFromGridFS(file.gridfsId);
      await file.deleteOne();
      return res.status(410).json({ error: 'File has expired and been deleted.' });
    }
    if (file.downloadCount >= file.maxDownloads) {
      return res.status(410).json({ error: 'Download limit reached.' });
    }

    return res.status(200).json({
      fileName: file.fileName,
      iv: file.iv,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      storageUrl: `/api/files/${id}/download`,
      downloadsRemaining: file.maxDownloads - file.downloadCount,
      expiresAt: file.expiresAt,
    });
  } catch (err) {
    console.error('getFileMetadata error:', err);
    return res.status(500).json({ error: 'Could not retrieve file metadata.' });
  }
}

async function downloadFile(req, res) {
  try {
    const { id } = req.params;
    const file = await File.findOne({ fileId: id });

    if (!file) return res.status(404).json({ error: 'File not found.' });
    if (file.expiresAt < new Date()) {
      await deleteFromGridFS(file.gridfsId);
      await file.deleteOne();
      return res.status(410).json({ error: 'File has expired.' });
    }
    if (file.downloadCount >= file.maxDownloads) {
      await deleteFromGridFS(file.gridfsId);
      await file.deleteOne();
      return res.status(410).json({ error: 'Download limit reached. File deleted.' });
    }

    await File.updateOne({ fileId: id }, { $inc: { downloadCount: 1 } });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="encrypted_${file.fileName}"`);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    streamFromGridFS(file.gridfsId, res);

    const updatedCount = file.downloadCount + 1;
    if (updatedCount >= file.maxDownloads) {
      setImmediate(async () => {
        try {
          await deleteFromGridFS(file.gridfsId);
          await File.deleteOne({ fileId: id });
          console.log(`🗑️  Auto-deleted after download limit: ${id}`);
        } catch (e) {
          console.error('Cleanup error:', e.message);
        }
      });
    }
  } catch (err) {
    console.error('downloadFile error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed.' });
  }
}

module.exports = { uploadMiddleware, uploadFile, getFileMetadata, downloadFile };