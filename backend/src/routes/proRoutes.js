const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { db } = require('../models');
const { getProDashboard, activatePro } = require('../controllers/proController');

const router = express.Router();

router.get('/pro/me', requireAuth, requireRole(db.USER_ROLES.USER), getProDashboard);
router.post('/pro/activate', requireAuth, requireRole(db.USER_ROLES.USER), activatePro);

module.exports = { proRoutes: router };
