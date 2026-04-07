const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { db } = require('../models');
const {
  createTheater,
  listMyTheaters,
  createHallWithLayout,
  listMyHalls,
  createShow,
  getHallSchedule,
  revenueSummary,
} = require('../controllers/ownerController');

const router = express.Router();

router.use(requireAuth, requireRole(db.USER_ROLES.OWNER));

router.get('/me/theaters', listMyTheaters);
router.post('/theaters', createTheater);

router.get('/me/halls', listMyHalls);
router.post('/halls', createHallWithLayout);

router.get('/halls/:hallId/schedule', getHallSchedule);
router.post('/shows', createShow);

router.get('/me/revenue', revenueSummary);

module.exports = { ownerRoutes: router };

