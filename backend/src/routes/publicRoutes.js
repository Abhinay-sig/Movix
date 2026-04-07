const express = require('express');
const {
  listMovies,
  listShowsForMovie,
  listTheaterTimeline,
  showSeatMap,
  estimatePrice,
} = require('../controllers/publicController');

const router = express.Router();

router.get('/movies', listMovies);
router.get('/movies/:movieId/shows', listShowsForMovie);
router.get('/theaters/:theaterId/timeline', listTheaterTimeline);
router.get('/shows/:showId/seatmap', showSeatMap);
router.post('/shows/:showId/estimate', express.json(), estimatePrice);

module.exports = { publicRoutes: router };

