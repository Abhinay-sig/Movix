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
  createMovie,

  // ✅ ADD THESE
  getMovieById,
  updateMovie,
  deleteMovie,
} = require('../controllers/adminController');

const router = express.Router();

router.use(requireAuth, requireRole(db.USER_ROLES.ADMIN));

router.get('/dashboard/revenue', revenueDashboard);
router.get('/theaters/contribution', listTheatersWithContribution);

// ✅ FIXED ROUTES
router.post('/movies', createMovie);
router.get('/movies', async (req, res, next) => {
  try {
    const movies = await db.Movie.findAll({
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
router.post('/approvals/hall', approveHall);
router.post('/approvals/show', approveShow);

router.post('/block', setBlocked);
router.post('/seat-types/cap', setSeatTypeCap);

router.post('/shows/cancel', cancelShow);

module.exports = { adminRoutes: router };