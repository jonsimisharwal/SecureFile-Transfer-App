const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    // iv is 'packed' when frontend packs IV inside the encrypted blob
    iv: {
      type: String,
      default: 'packed',
    },
    gridfsId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    // TTL index — MongoDB auto-deletes document when expiresAt is reached
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    maxDownloads: {
      type: Number,
      default: 1,
      min: 1,
      max: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('File', fileSchema);