const express = require('express');
const router = express.Router();
const { testFirestoreConnection } = require('../config/firebaseTest');

/**
 * GET /api/firebase/test
 * Development/testing route to verify Firebase Admin initialization and Firestore connectivity.
 */
router.get('/test', async (req, res, next) => {
  try {
    const result = await testFirestoreConnection();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(503).json({
        success: false,
        message: 'Unable to connect to Firebase',
        details: process.env.NODE_ENV !== 'production' ? result.message : undefined
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
