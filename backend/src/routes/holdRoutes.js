const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createHold, confirmBooking, listMyBookings } = require('../controllers/holdController');
const { db } = require('../models');

const router = express.Router();

// user seat hold + confirm booking
router.post('/holds', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), createHold);
router.post('/bookings/confirm', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), confirmBooking);
router.get('/bookings/my', requireAuth, requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN), listMyBookings);

module.exports = { holdRoutes: router };
