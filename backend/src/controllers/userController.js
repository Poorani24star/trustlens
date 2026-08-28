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

module.exports = {
  getMe,
  createProfile,
  updateMe,
};
