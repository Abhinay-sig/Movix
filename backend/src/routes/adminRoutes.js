const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { db } = require('../models');
const {
  pendingApprovals,
  approveHall,
  approveShow,
  setBlocked,
  setSeatTypeCap,
  revenueDashboard,
  cancelShow,
  listTheatersWithContribution,
} = require('../controllers/adminController');

const router = express.Router();

router.use(requireAuth, requireRole(db.USER_ROLES.ADMIN));

router.get('/dashboard/revenue', revenueDashboard);
router.get('/theaters/contribution', listTheatersWithContribution);

router.get('/approvals/pending', pendingApprovals);
router.post('/approvals/hall', approveHall);
router.post('/approvals/show', approveShow);

router.post('/block', setBlocked);
router.post('/seat-types/cap', setSeatTypeCap);

router.post('/shows/cancel', cancelShow);

module.exports = { adminRoutes: router };

