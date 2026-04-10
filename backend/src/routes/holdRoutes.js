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
<<<<<<< HEAD
router.post('/holds', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), createHold);
router.post('/bookings/confirm', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), confirmBooking);
router.get('/bookings/my', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), listMyBookings);
=======
router.post('/holds', requireAuth, requireRole(db.USER_ROLES.USER), createHold);
router.post('/holds/release', requireAuth, requireRole(db.USER_ROLES.USER), releaseHold);
router.post('/payments/otp/send', requireAuth, requireRole(db.USER_ROLES.USER), sendPaymentOtp);
router.post('/payments/otp/verify', requireAuth, requireRole(db.USER_ROLES.USER), verifyPaymentOtp);
router.post('/bookings/confirm', requireAuth, requireRole(db.USER_ROLES.USER), confirmBooking);
router.get('/bookings/my', requireAuth, requireRole(db.USER_ROLES.USER), listMyBookings);
>>>>>>> origin/main

module.exports = { holdRoutes: router };
