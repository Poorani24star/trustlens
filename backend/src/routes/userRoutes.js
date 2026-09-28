const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

// Public Auth Recovery Routes
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Protected User Routes
router.get('/me', authenticateUser, userController.getMe);
router.post('/profile', authenticateUser, userController.createProfile);
router.patch('/me', authenticateUser, userController.updateMe);

// Role Authorization Demonstration / Protection Verification Routes
router.get('/faculty-only', authenticateUser, authorizeRoles('faculty', 'researcher'), (req, res) => {
  res.json({
    success: true,
    message: 'Access granted to Faculty and Researcher role'
  });
});

router.get('/admin-only', authenticateUser, authorizeRoles('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Access granted to Admin role'
  });
});

module.exports = router;
