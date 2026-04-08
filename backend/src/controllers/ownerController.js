const { z } = require('zod');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');

const createTheaterSchema = z.object({
  name: z.string().min(1).max(160),
  address: z.string().min(1).max(255),
  city: z.string().min(1).max(120),
});

function wallClockUtc(date, time = '00:00') {
  const [year, month, day] = String(date).split('-').map(Number);
  const [hour, minute] = String(time).split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}

async function createTheater(req, res, next) {
  try {
    const body = createTheaterSchema.parse(req.body);
    const theater = await db.Theater.create({
      ownerUserId: req.user.id,
      name: body.name,
      address: body.address,
      city: body.city,
    });
    res.status(201).json({ theater });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function listMyTheaters(req, res, next) {
  try {
    const theaters = await db.Theater.findAll({ where: { ownerUserId: req.user.id } });
    res.json({ theaters });
  } catch (e) {
    next(e);
  }
}

function countLayoutSeats(layout) {
  if (!layout?.segmentsByRow || !Array.isArray(layout.segmentsByRow)) return null;
  let total = 0;
  for (const row of layout.segmentsByRow) {
    if (!Array.isArray(row)) continue;
    for (let i = 0; i < row.length; i += 2) {
      const start = row[i];
      const end = row[i + 1];
      if (typeof start !== 'number' || typeof end !== 'number') continue;
      total += end - start + 1;
    }
  }
  return total;
}

async function listTheaterHalls(req, res, next) {
  try {
    const theaterId = Number(req.params.theaterId);
    if (!Number.isInteger(theaterId) || theaterId <= 0) {
      throw new HttpError(400, 'Invalid theater id');
    }

    const theater = await db.Theater.findByPk(theaterId);
    if (!theater || String(theater.ownerUserId) !== String(req.user.id)) {
      throw new HttpError(404, 'Theater not found');
    }

    const halls = await db.Hall.findAll({
      where: { theaterId },
      include: [{ model: db.HallLayout }],
      order: [['name', 'ASC']],
    });

    res.json({
      theater,
      halls: halls.map((hall) => ({
        ...hall.toJSON(),
        seatingCapacity: countLayoutSeats(hall.HallLayout),
      })),
    });
  } catch (e) {
    next(e);
  }
}

async function listMyMovies(req, res, next) {
  try {
    const movies = await db.Movie.findAll({
      where: { isActive: true },
      order: [['title', 'ASC']],
    });

    const movieIds = movies.map((movie) => movie.id);
    const ownerShows = movieIds.length
      ? await db.Show.findAll({
          attributes: ['movieId'],
          include: [
            {
              model: db.Hall,
              required: true,
              attributes: [],
              include: [
                {
                  model: db.Theater,
                  required: true,
                  attributes: [],
                  where: { ownerUserId: req.user.id },
                },
              ],
            },
          ],
          where: { movieId: { [Op.in]: movieIds } },
        })
      : [];

    const showCountByMovieId = new Map();
    for (const show of ownerShows) {
      const key = String(show.movieId);
      showCountByMovieId.set(key, (showCountByMovieId.get(key) ?? 0) + 1);
    }

    res.json({
      movies: movies.map((movie) => ({
        ...movie.toJSON(),
        addedAt: movie.createdAt,
        showCount: showCountByMovieId.get(String(movie.id)) ?? 0,
      })),
    });
  } catch (e) {
    next(e);
  }
}

const createHallSchema = z.object({
  theaterId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(120),

  segmentsByRow: z.array(z.array(z.number().int().min(0).max(79))).length(50),
  typedSegmentsByRow: z
    .array(
      z.array(
        z.object({
          start: z.number().int().min(0).max(79),
          end: z.number().int().min(0).max(79),
          type: z.string().min(1).max(40),
        })
      )
    )
    .length(50)
    .optional(),
});

function validateSegmentsByRow(segmentsByRow) {
  for (let r = 0; r < segmentsByRow.length; r++) {
    const row = segmentsByRow[r];
    if (row.length % 2 !== 0) throw new HttpError(400, `Row ${r} segments must be pairs`);
    for (let i = 0; i < row.length; i += 2) {
      const start = row[i];
      const end = row[i + 1];
      if (start > end) throw new HttpError(400, `Row ${r} segment start > end`);
      if (i > 0 && start <= row[i - 1]) throw new HttpError(400, `Row ${r} segments must increase`);
    }
  }
}

async function createHallWithLayout(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = createHallSchema.parse(req.body);
    validateSegmentsByRow(body.segmentsByRow);

    const theater = await db.Theater.findByPk(body.theaterId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!theater || String(theater.ownerUserId) !== String(req.user.id)) {
      throw new HttpError(404, 'Theater not found');
    }

    const hall = await db.Hall.create(
      { theaterId: theater.id, name: body.name, isApproved: false },
      { transaction: t }
    );

    const layout = await db.HallLayout.create(
      {
        hallId: hall.id,
        rows: 50,
        cols: 80,
        segmentsByRow: body.segmentsByRow,
        typedSegmentsByRow: body.typedSegmentsByRow ?? null,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({ hall, layout });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function listMyHalls(req, res, next) {
  try {
    const theaters = await db.Theater.findAll({ where: { ownerUserId: req.user.id } });
    const theaterIds = theaters.map((t) => t.id);
    const halls = await db.Hall.findAll({
      where: { theaterId: { [Op.in]: theaterIds } },
      include: [{ model: db.Theater }],
    });
    res.json({ halls });
  } catch (e) {
    next(e);
  }
}

const createShowSchema = z.object({
  theaterId: z.coerce.number().int().positive().optional(),
  hallId: z.coerce.number().int().positive(),
  movieId: z.coerce.number().int().positive(),
  ticketPrice: z.coerce.number().nonnegative().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  durationMins: z.coerce.number().int().positive().max(480), // max 8 hours
  language: z.string().min(1).max(40),
  seatPrices: z
    .array(
      z.object({
        seatTypeCode: z.string().min(1).max(40),
        price: z.coerce.number().positive(),
      })
    )
    .min(1, 'At least one seat price is required'),
});

const getHallScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
});

async function getHallSchedule(req, res, next) {
  try {
    const { hallId } = req.params;
    const { date } = getHallScheduleSchema.parse(req.query);

    const hall = await db.Hall.findByPk(hallId, {
      include: [{ model: db.Theater }],
    });
    if (!hall || String(hall.Theater.ownerUserId) !== String(req.user.id)) {
      throw new HttpError(404, 'Hall not found');
    }

    const startOfDay = wallClockUtc(date, '00:00');
    const endOfDay = wallClockUtc(date, '23:59');

    const shows = await db.Show.findAll({
      where: {
        hallId: hall.id,
        isCancelled: false,
        startsAt: { [Op.lte]: endOfDay },
        endsAt: { [Op.gte]: startOfDay },
      },
      include: [{ model: db.Movie }],
      order: [['startsAt', 'ASC']],
    });

    const bufferMins = 30;
    const schedule = shows.map((show) => ({
      id: show.id,
      movieTitle: show.Movie.title,
      startsAt: show.startsAt,
      endsAt: show.endsAt,
      language: show.language,
      isApproved: show.isApproved,
      bufferStart: dayjs(show.startsAt).subtract(bufferMins, 'minute').toDate(),
      bufferEnd: dayjs(show.endsAt).add(bufferMins, 'minute').toDate(),
    }));

    res.json({ schedule, bufferMins });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function createShow(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = createShowSchema.parse(req.body);

    const hall = await db.Hall.findByPk(body.hallId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
      include: [{ model: db.Theater }],
    });
    if (!hall || String(hall.Theater.ownerUserId) !== String(req.user.id)) {
      throw new HttpError(404, 'Hall not found');
    }

    const movie = await db.Movie.findByPk(body.movieId, { transaction: t });
    if (!movie || !movie.isActive) throw new HttpError(404, 'Movie not found');
    if (body.date < String(movie.releaseDate)) {
      throw new HttpError(400, 'Cannot schedule a show before the movie release date');
    }

    const durationMins = Number(movie.durationMins);

    const startsAt = wallClockUtc(body.date, body.startTime);
    const endsAt = new Date(startsAt.getTime() + durationMins * 60_000);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new HttpError(400, 'Invalid show time');
    }

    const bufferMins = 30;
    const bufferedStart = new Date(startsAt.getTime() - bufferMins * 60_000);
    const bufferedEnd = new Date(endsAt.getTime() + bufferMins * 60_000);

    const conflicts = await db.Show.count({
      where: {
        hallId: hall.id,
        isCancelled: false,
        startsAt: { [Op.lt]: bufferedEnd },
        endsAt: { [Op.gt]: bufferedStart },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (conflicts > 0) throw new HttpError(409, 'Show conflicts with existing timeline (30 min buffer)');

    const normalizedSeatPrices = (body.seatPrices ?? []).map((seatPrice) => ({
      ...seatPrice,
      price: Number(seatPrice.price),
    }));
    const fallbackPrice =
      typeof body.ticketPrice === 'number'
        ? Number(body.ticketPrice)
        : normalizedSeatPrices.length
          ? Math.min(...normalizedSeatPrices.map((seatPrice) => seatPrice.price))
          : 0;

    const show = await db.Show.create(
      {
        hallId: hall.id,
        movieId: body.movieId,
        price: fallbackPrice,
        startsAt,
        endsAt,
        language: body.language,
        isApproved: false,
      },
      { transaction: t }
    );

    if (normalizedSeatPrices.length) {
      const seatTypes = await db.SeatType.findAll({ transaction: t });
      const byCode = new Map(seatTypes.map((s) => [s.code, s]));
      for (const sp of normalizedSeatPrices) {
        const st = byCode.get(sp.seatTypeCode);
        if (!st) throw new HttpError(400, `Unknown seat type: ${sp.seatTypeCode}`);
        if (Number(sp.price) > Number(st.adminPriceCap)) {
          throw new HttpError(400, `Price exceeds admin cap for ${st.code}`);
        }

        await db.ShowSeatPrice.create(
          { showId: show.id, seatTypeId: st.id, price: sp.price },
          { transaction: t }
        );
      }
    }

    await t.commit();
    res.status(201).json({ show });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function revenueSummary(req, res, next) {
  try {
    const theaters = await db.Theater.findAll({ where: { ownerUserId: req.user.id } });
    const theaterIds = theaters.map((t) => t.id);
    const halls = theaterIds.length
      ? await db.Hall.findAll({ where: { theaterId: { [Op.in]: theaterIds } } })
      : [];
    const hallIds = halls.map((h) => h.id);
    const shows = hallIds.length ? await db.Show.findAll({ where: { hallId: { [Op.in]: hallIds } } }) : [];
    const showIds = shows.map((s) => s.id);

    const bookings = showIds.length
      ? await db.Booking.findAll({
          where: {
            showId: { [Op.in]: showIds },
            status: db.BOOKING_STATUS.CONFIRMED,
          },
        })
      : [];
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

    const soldTickets = showIds.length
      ? await db.BookingSeat.count({
          where: { showId: { [Op.in]: showIds } },
        })
      : 0;

    const theaterById = new Map(theaters.map((theater) => [String(theater.id), theater]));
    const hallToTheaterId = new Map(halls.map((hall) => [String(hall.id), String(hall.theaterId)]));
    const showToHallId = new Map(shows.map((show) => [String(show.id), String(show.hallId)]));

    const breakdownMap = new Map(
      theaters.map((theater) => [
        String(theater.id),
        {
          theaterId: theater.id,
          theaterName: theater.name,
          city: theater.city,
          totalRevenue: 0,
          bookingCount: 0,
        },
      ])
    );

    for (const booking of bookings) {
      const hallId = showToHallId.get(String(booking.showId));
      const theaterId = hallToTheaterId.get(String(hallId));
      if (!theaterId || !breakdownMap.has(theaterId)) continue;
      const row = breakdownMap.get(theaterId);
      row.totalRevenue += Number(booking.totalAmount);
      row.bookingCount += 1;
    }

    const breakdown = Array.from(breakdownMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const recentBookings = bookings
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((booking) => {
        const hallId = showToHallId.get(String(booking.showId));
        const theaterId = hallToTheaterId.get(String(hallId));
        const theater = theaterById.get(String(theaterId));
        return {
          bookingId: booking.id,
          showId: booking.showId,
          totalAmount: Number(booking.totalAmount),
          createdAt: booking.createdAt,
          theaterName: theater?.name ?? 'Unknown theater',
        };
      });

    res.json({
      totalRevenue,
      totalBookings: bookings.length,
      soldTickets,
      theaterCount: theaters.length,
      breakdown,
      recentBookings,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createTheater,
  listMyTheaters,
  listTheaterHalls,
  listMyMovies,
  createHallWithLayout,
  listMyHalls,
  getHallSchedule,
  createShow,
  revenueSummary,
};
