const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

let bucket = null;

function getBucket() {
  if (!bucket) {
    bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'encryptedFiles',
    });
  }
  return bucket;
}

// Reset bucket on disconnect (so it reinitializes on reconnect)
mongoose.connection.on('disconnected', () => { bucket = null; });

function uploadToGridFS(encryptedBuffer, fileName, mimeType) {
  return new Promise((resolve, reject) => {
    const b = getBucket();
    const readable = Readable.from(Buffer.from(encryptedBuffer));
    const uploadStream = b.openUploadStream(fileName, {
      contentType: mimeType,
      metadata: { encrypted: true, uploadedAt: new Date() },
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id));
    readable.pipe(uploadStream);
  });
}

function streamFromGridFS(gridfsId, res) {
  const b = getBucket();
  const downloadStream = b.openDownloadStream(new mongoose.Types.ObjectId(gridfsId));
  downloadStream.on('error', (err) => {
    console.error('GridFS stream error:', err.message);
    if (!res.headersSent) {
      res.status(404).json({ error: 'File not found in storage.' });
    }
  });
  downloadStream.pipe(res);
}

async function deleteFromGridFS(gridfsId) {
  try {
    const b = getBucket();
    await b.delete(new mongoose.Types.ObjectId(gridfsId));
  } catch (err) {
    console.error('GridFS delete error:', err.message);
  }
}

module.exports = { uploadToGridFS, streamFromGridFS, deleteFromGridFS };