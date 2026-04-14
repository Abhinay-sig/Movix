const express = require('express');
const {
  signup,
  login,
  adminLogin,
  resendVerification,
  forgotPassword,
  resetPassword,
  verifyEmail,
  googleStart,
  googleCallback,
} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email', verifyEmail);
router.get('/google/start', googleStart);
router.get('/google/callback', googleCallback);

module.exports = { authRoutes: router };
