const userService = require('../services/userService');

/**
 * GET /api/users/me
 * Retrieves current authenticated user profile
 */
async function getMe(req, res, next) {
  try {
    if (!req.user || !req.user.isProfileComplete) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found. Please complete profile registration.'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        uid: req.user.uid,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/profile
 * Creates user profile in Firestore after Firebase Auth registration
 */
async function createProfile(req, res, next) {
  try {
    const { name, role } = req.body;
    const { uid, email } = req.user;

    const profile = await userService.createUserProfile(uid, email, { name, role });

    return res.status(201).json({
      success: true,
      user: profile
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * PATCH /api/users/me
 * Updates allowed fields (name) for authenticated user profile
 */
async function updateMe(req, res, next) {
  try {
    if (!req.user || !req.user.isProfileComplete) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    const { name } = req.body;

    const updatedProfile = await userService.updateUserProfile(req.user.uid, { name });

    return res.status(200).json({
      success: true,
      user: updatedProfile
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

const authEmulatorService = require('../services/authEmulatorService');

/**
 * POST /api/users/forgot-password
 * Public endpoint to request a password reset
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Please enter your email address.' });
    }
    const exists = authEmulatorService.userExists(trimmed);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }
    return res.status(200).json({
      success: true,
      message: `Password reset instructions have been sent to ${trimmed}.`,
      email: trimmed
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/reset-password
 * Public endpoint to reset password with validation
 */
async function resetPassword(req, res, next) {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Please enter your email address.' });
    }
    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'Please enter your new password.' });
    }
    if (newPassword.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.' 
      });
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    const result = authEmulatorService.updateUserPassword(trimmed, newPassword);
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.message || 'User not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Password has been successfully updated! You can now sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
  createProfile,
  updateMe,
  forgotPassword,
  resetPassword,
};
