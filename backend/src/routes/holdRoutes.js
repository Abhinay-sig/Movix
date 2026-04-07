const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createHold, confirmBooking } = require('../controllers/holdController');
const { db } = require('../models');

const router = express.Router();

// user seat hold + confirm booking
router.post('/holds', requireAuth, requireRole(db.USER_ROLES.USER), createHold);
router.post('/bookings/confirm', requireAuth, requireRole(db.USER_ROLES.USER), confirmBooking);

module.exports = { holdRoutes: router };

