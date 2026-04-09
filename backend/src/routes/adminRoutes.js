const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { db } = require('../models');
const {
  pendingApprovals,
  pendingHallDetails,
  pendingShowDetails,
  listHalls,
  listApprovedHalls,
  hallCapsDetails,
  updateHallCaps,
  hallCapHistory,
  suggestedCapsForHall,
  approvePendingHallWithCaps,
  approveHall,
  approveShow,
  rejectHall,
  rejectShow,
  setBlocked,
  setSeatTypeCap,
  revenueTrend,
  dashboardStats,
  activityFeed,
  revenueReport,
  bookingReport,
  theaterPerformanceReport,
  seatTypeRevenueReport,
  revenueDashboard,
  cancelShow,
  listTheatersWithContribution,
} = require('../controllers/adminController');

const router = express.Router();

router.use(requireAuth, requireRole(db.USER_ROLES.ADMIN));

router.get('/dashboard/revenue', revenueDashboard);
router.get('/revenue-trend', revenueTrend);
router.get('/stats', dashboardStats);
router.get('/activity', activityFeed);
router.get('/reports/revenue', revenueReport);
router.get('/reports/bookings', bookingReport);
router.get('/reports/theater-performance', theaterPerformanceReport);
router.get('/reports/seat-type', seatTypeRevenueReport);
router.get('/theaters/contribution', listTheatersWithContribution);

router.get('/approvals/pending', pendingApprovals);
router.get('/halls', listHalls);
router.get('/halls/pending/:id', pendingHallDetails);
router.get('/halls/approved', listApprovedHalls);
router.get('/halls/:id/caps', hallCapsDetails);
router.put('/halls/:id/caps', updateHallCaps);
router.get('/halls/:id/cap-history', hallCapHistory);
router.get('/halls/:id/suggested-caps', suggestedCapsForHall);
router.post('/halls/:id/approve', approvePendingHallWithCaps);
router.get('/shows/pending/:id', pendingShowDetails);
router.post('/approvals/hall', approveHall);
router.post('/approvals/show', approveShow);
router.post('/halls/:id/reject', rejectHall);
router.post('/shows/:id/reject', rejectShow);

router.post('/block', setBlocked);
router.post('/seat-types/cap', setSeatTypeCap);

router.post('/shows/cancel', cancelShow);

module.exports = { adminRoutes: router };
