require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { startCronJob } = require('./utils/cronJob');

const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL ;

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log('✅ MongoDB connected');

    // Start auto-delete cron job
    startCronJob();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });