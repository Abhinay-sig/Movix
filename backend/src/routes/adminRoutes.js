const express = require('express');
const { Op } = require('sequelize');
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
  approveTheater,
  approveHall,
  approveShow,
  rejectHall,
  rejectShow,
  setBlocked,
  setSeatTypeCap,
  revenueTrend,
  dashboardStats,
  systemHealth,
  activityFeed,
  revenueReport,
  bookingReport,
  theaterPerformanceReport,
  seatTypeRevenueReport,
  revenueDashboard,
  cancelShow,
  listTheatersWithContribution,
  revenueByTheater,
  createMovie,

  // ✅ ADD THESE
  getMovieById,
  updateMovie,
  deleteMovie,
} = require('../controllers/adminController');

const router = express.Router();

router.use(requireAuth, requireRole(db.USER_ROLES.ADMIN));

router.get('/dashboard/revenue', revenueDashboard);
router.get('/revenue-trend', revenueTrend);
router.get('/revenue/by-theater', revenueByTheater);
router.get('/stats', dashboardStats);
router.get('/system-health', systemHealth);
router.get('/activity', activityFeed);
router.get('/reports/revenue', revenueReport);
router.get('/reports/bookings', bookingReport);
router.get('/reports/theater-performance', theaterPerformanceReport);
router.get('/reports/seat-type', seatTypeRevenueReport);
router.get('/theaters/contribution', listTheatersWithContribution);

// ✅ FIXED ROUTES
router.post('/movies', createMovie);
router.get('/movies', async (req, res, next) => {
  try {
    const where = {};
    const and = [];

    if (String(req.query.name ?? '').trim()) {
      and.push(
        db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('title')), {
          [Op.like]: `%${String(req.query.name).trim().toLowerCase()}%`,
        })
      );
    }

    if (String(req.query.genre ?? '').trim()) {
      and.push(
        db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('genre')), {
          [Op.like]: `%${String(req.query.genre).trim().toLowerCase()}%`,
        })
      );
    }

    if (String(req.query.releaseDate ?? '').trim()) {
      and.push(
        db.sequelize.where(
          db.sequelize.fn('DATE_FORMAT', db.sequelize.col('release_date'), '%Y-%m-%d'),
          { [Op.like]: `%${String(req.query.releaseDate).trim()}%` }
        )
      );
    }

    if (and.length) where[Op.and] = and;

    const movies = await db.Movie.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    res.json({ movies });
  } catch (e) {
    next(e);
  }
});
router.get('/movies/:id', getMovieById);
router.patch('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

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
router.post('/approvals/theater', approveTheater);
router.post('/approvals/hall', approveHall);
router.post('/approvals/show', approveShow);
router.post('/halls/:id/reject', rejectHall);
router.post('/shows/:id/reject', rejectShow);

router.post('/block', setBlocked);
router.post('/seat-types/cap', setSeatTypeCap);

router.post('/shows/cancel', cancelShow);

module.exports = { adminRoutes: router };
