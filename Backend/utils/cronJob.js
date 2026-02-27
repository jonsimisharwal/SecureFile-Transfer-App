const cron = require('node-cron');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const File = require('../models/File');

async function deleteExpiredFiles() {
  try {
    const now = new Date();
    const expiredFiles = await File.find({
      $or: [
        { expiresAt: { $lte: now } },
        { $expr: { $gte: ['$downloadCount', '$maxDownloads'] } },
      ],
    });

    if (expiredFiles.length === 0) return;

    console.log(`🗑️  Cron: Deleting ${expiredFiles.length} expired file(s)...`);

    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'encryptedFiles',
    });

    for (const file of expiredFiles) {
      try {
        await bucket.delete(file.gridfsId);
        await File.deleteOne({ _id: file._id });
        console.log(`   ✅ Deleted: ${file.fileName} (expired: ${file.expiresAt})`);
      } catch (err) {
        console.error(`   ❌ Failed: ${file.fileId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Cron job error:', err.message);
  }
}

function startCronJob() {
  // Run every minute — supports short expiries like 30 seconds
  cron.schedule('* * * * *', async () => {
    await deleteExpiredFiles();
  });

  console.log('✅ Auto-delete cron job started (every 1 minute).');
}

module.exports = { startCronJob, deleteExpiredFiles };