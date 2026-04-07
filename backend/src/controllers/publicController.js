const { Op } = require('sequelize');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');
const { parseSeatCode, layoutHasSeat, seatTypeForSeat } = require('../utils/seatLayout');

async function listMovies(req, res, next) {
  try {
    const movies = await db.Movie.findAll({ where: { isActive: true } });
    res.json({ movies });
  } catch (e) {
    next(e);
  }
}

async function listShowsForMovie(req, res, next) {
  try {
    const movieId = Number(req.params.movieId);
    const shows = await db.Show.findAll({
      where: { movieId, isApproved: true, isBlocked: false, isCancelled: false },
      include: [{ model: db.Hall, where: { isApproved: true, isBlocked: false }, include: [{ model: db.Theater, where: { isBlocked: false } }] }],
      order: [['startsAt', 'ASC']],
    });
    res.json({ shows });
  } catch (e) {
    next(e);
  }
}

async function listTheaterTimeline(req, res, next) {
  try {
    const theaterId = Number(req.params.theaterId);
    const halls = await db.Hall.findAll({
      where: { theaterId, isApproved: true, isBlocked: false },
      include: [{ model: db.Theater, where: { isBlocked: false } }],
    });
    if (!halls.length) throw new HttpError(404, 'Theater not found');
    const hallIds = halls.map((h) => h.id);
    const shows = await db.Show.findAll({
      where: { hallId: { [Op.in]: hallIds }, isApproved: true, isBlocked: false, isCancelled: false },
      include: [{ model: db.Movie }],
      order: [['startsAt', 'ASC']],
    });
    res.json({ halls, shows });
  } catch (e) {
    next(e);
  }
}

async function showSeatMap(req, res, next) {
  try {
    const showId = Number(req.params.showId);
    const show = await db.Show.findByPk(showId, {
      include: [{ model: db.Hall, include: [{ model: db.Theater }] }],
    });
    if (
      !show ||
      !show.isApproved ||
      show.isBlocked ||
      show.isCancelled ||
      show.Hall.isBlocked ||
      !show.Hall.isApproved ||
      show.Hall.Theater.isBlocked
    ) {
      throw new HttpError(404, 'Show not available');
    }

    const layout = await db.HallLayout.findOne({ where: { hallId: show.hallId } });
    if (!layout) throw new HttpError(409, 'Seat layout not configured');

    const now = new Date();
    const held = await db.SeatHold.findAll({
      where: { showId: show.id, status: db.HOLD_STATUS.HELD, expiresAt: { [Op.gt]: now } },
    });
    const booked = await db.BookingSeat.findAll({ where: { showId: show.id } });

    res.json({
      showId: show.id,
      hallId: show.hallId,
      layout: { rows: layout.rows, cols: layout.cols, segmentsByRow: layout.segmentsByRow, typedSegmentsByRow: layout.typedSegmentsByRow },
      heldSeats: held.map((h) => h.seatCode),
      bookedSeats: booked.map((b) => b.seatCode),
    });
  } catch (e) {
    next(e);
  }
}

async function estimatePrice(req, res, next) {
  try {
    const showId = Number(req.params.showId);
    const seatCodes = Array.isArray(req.body?.seatCodes) ? req.body.seatCodes : [];
    if (seatCodes.length < 1 || seatCodes.length > 10) throw new HttpError(400, 'Seat count must be 1..10');

    const show = await db.Show.findByPk(showId);
    if (!show) throw new HttpError(404, 'Show not found');
    const layout = await db.HallLayout.findOne({ where: { hallId: show.hallId } });
    if (!layout) throw new HttpError(409, 'Seat layout not configured');

    const prices = await db.ShowSeatPrice.findAll({ where: { showId }, include: [{ model: db.SeatType }] });
    const byTypeCode = new Map(prices.map((p) => [p.SeatType.code, Number(p.price)]));

    let total = 0;
    const breakdown = [];
    for (const sc of seatCodes) {
      const parsed = parseSeatCode(sc);
      if (!parsed) throw new HttpError(400, `Invalid seat code: ${sc}`);
      if (!layoutHasSeat(layout, parsed.rowIdx, parsed.colIdx)) throw new HttpError(400, `Seat does not exist: ${sc}`);
      const typeCode = seatTypeForSeat(layout, parsed.rowIdx, parsed.colIdx) ?? db.SEAT_TYPES.STANDARD;
      const price = byTypeCode.get(typeCode) ?? 0;
      total += price;
      breakdown.push({ seatCode: sc.toUpperCase(), seatTypeCode: typeCode, price });
    }

    res.json({ total, breakdown });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listMovies,
  listShowsForMovie,
  listTheaterTimeline,
  showSeatMap,
  estimatePrice,
};

