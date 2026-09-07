require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');

const firebaseRoutes = require('./src/routes/firebaseRoutes');
const userRoutes = require('./src/routes/userRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const extractionRoutes = require('./src/routes/extractionRoutes');
const knowledgeRoutes = require('./src/routes/knowledgeRoutes');
const errorDetectionRoutes = require('./src/routes/errorDetectionRoutes');
const copiedContentRoutes = require('./src/routes/copiedContentRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Route
app.get('/', (req, res) => {
  res.json({
    message: 'TrustLens backend is running'
  });
});

// Routes
app.use('/api/firebase', firebaseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/extraction', extractionRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/error-detection', errorDetectionRoutes);
app.use('/api/copied-content', copiedContentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// 404 & Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const { startAuthEmulator } = require('./src/services/authEmulatorService');

// Port Configuration & Server Startup
const PORT = process.env.PORT || 5000;

// Start Firebase Auth Emulator and backend server
startAuthEmulator().then(() => {
  app.listen(PORT, () => {
    console.log(`TrustLens backend running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start Auth Emulator:', err.message);
  app.listen(PORT, () => {
    console.log(`TrustLens backend running on port ${PORT}`);
  });
});
