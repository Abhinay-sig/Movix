const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createHold,
  confirmBooking,
  listMyBookings,
  sendPaymentOtp,
  verifyPaymentOtp,
  releaseHold,
} = require('../controllers/holdController');
const { db } = require('../models');

const router = express.Router();

// user seat hold + confirm booking
router.post('/holds', requireAuth, requireRole(db.USER_ROLES.USER), createHold);
router.post('/holds/release', requireAuth, requireRole(db.USER_ROLES.USER), releaseHold);
router.post('/payments/otp/send', requireAuth, requireRole(db.USER_ROLES.USER), sendPaymentOtp);
router.post('/payments/otp/verify', requireAuth, requireRole(db.USER_ROLES.USER), verifyPaymentOtp);
router.post('/bookings/confirm', requireAuth, requireRole(db.USER_ROLES.USER), confirmBooking);
router.get('/bookings/my', requireAuth, requireRole(db.USER_ROLES.USER), listMyBookings);

module.exports = { holdRoutes: router };
