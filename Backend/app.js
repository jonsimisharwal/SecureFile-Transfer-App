const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fileRoutes = require('./routes/fileRoutes');

const app = express();

// Security headers
app.use(helmet());

// CORS — expose Content-Length so frontend can track download progress
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN ,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length'],   // ← required for download progress
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Upload limit reached. Please try again after an hour.' },
});

app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.status(403).json({ error: 'HTTPS is required.' });
  }
  next();
});

app.use('/api/files', uploadLimiter);
app.use('/api/files', fileRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;