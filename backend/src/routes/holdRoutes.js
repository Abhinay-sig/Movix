const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createHold,
  createRazorpayOrder,
  listMyBookings,
  verifyRazorpayPayment,
  releaseHold,
} = require('../controllers/holdController');
const { db } = require('../models');

const router = express.Router();

// user seat hold + confirm booking
router.post('/holds', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), createHold);
router.post('/holds/release', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), releaseHold);
router.post('/payments/razorpay/order', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), createRazorpayOrder);
router.post('/payments/razorpay/verify', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), verifyRazorpayPayment);
router.get('/bookings/my', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), listMyBookings);

module.exports = { holdRoutes: router };
