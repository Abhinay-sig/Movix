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
router.post('/holds', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), createHold);
router.post('/holds/release', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), releaseHold);
router.post('/payments/otp/send', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), sendPaymentOtp);
router.post('/payments/otp/verify', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), verifyPaymentOtp);
router.post('/bookings/confirm', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), confirmBooking);
router.get('/bookings/my', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), listMyBookings);

module.exports = { holdRoutes: router };
