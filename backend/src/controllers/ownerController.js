// const { z } = require('zod');
// const { Op } = require('sequelize');
// const dayjs = require('dayjs');
// const { db } = require('../models');
// const { HttpError } = require('../utils/httpError');

// const createTheaterSchema = z.object({
//   name: z.string().min(1).max(160),
//   address: z.string().min(1).max(255),
//   city: z.string().min(1).max(120),
// });

// async function createTheater(req, res, next) {
//   try {
//     const body = createTheaterSchema.parse(req.body);
//     const theater = await db.Theater.create({
//       ownerUserId: req.user.id,
//       name: body.name,
//       address: body.address,
//       city: body.city,
//     });
//     res.status(201).json({ theater });
//   } catch (e) {
//     if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
//     return next(e);
//   }
// }

// async function listMyTheaters(req, res, next) {
//   try {
//     const theaters = await db.Theater.findAll({ where: { ownerUserId: req.user.id } });
//     res.json({ theaters });
//   } catch (e) {
//     next(e);
//   }
// }

// const createHallSchema = z.object({
//   theaterId: z.coerce.number().int().positive(),
//   name: z.string().min(1).max(120),

//   segmentsByRow: z.array(z.array(z.number().int().min(0).max(79))).length(50),
//   typedSegmentsByRow: z
//     .array(
//       z.array(
//         z.object({
//           start: z.number().int().min(0).max(79),
//           end: z.number().int().min(0).max(79),
//           type: z.string().min(1).max(40),
//         })
//       )
//     )
//     .length(50)
//     .optional(),
// });

// function validateSegmentsByRow(segmentsByRow) {
//   for (let r = 0; r < segmentsByRow.length; r++) {
//     const row = segmentsByRow[r];
//     if (row.length % 2 !== 0) throw new HttpError(400, `Row ${r} segments must be pairs`);
//     for (let i = 0; i < row.length; i += 2) {
//       const start = row[i];
//       const end = row[i + 1];
//       if (start > end) throw new HttpError(400, `Row ${r} segment start > end`);
//       if (i > 0 && start <= row[i - 1]) throw new HttpError(400, `Row ${r} segments must increase`);
//     }
//   }
// }

// async function createHallWithLayout(req, res, next) {
//   const t = await db.sequelize.transaction();
//   try {
//     const body = createHallSchema.parse(req.body);
//     validateSegmentsByRow(body.segmentsByRow);

//     const theater = await db.Theater.findByPk(body.theaterId, { transaction: t, lock: t.LOCK.UPDATE });
//     if (!theater || String(theater.ownerUserId) !== String(req.user.id)) {
//       throw new HttpError(404, 'Theater not found');
//     }

//     const hall = await db.Hall.create(
//       { theaterId: theater.id, name: body.name, isApproved: false },
//       { transaction: t }
//     );

//     const layout = await db.HallLayout.create(
//       {
//         hallId: hall.id,
//         rows: 50,
//         cols: 80,
//         segmentsByRow: body.segmentsByRow,
//         typedSegmentsByRow: body.typedSegmentsByRow ?? null,
//       },
//       { transaction: t }
//     );

//     await t.commit();
//     res.status(201).json({ hall, layout });
//   } catch (e) {
//     await t.rollback();
//     if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
//     return next(e);
//   }
// }

// async function listMyHalls(req, res, next) {
//   try {
//     const theaters = await db.Theater.findAll({ where: { ownerUserId: req.user.id } });
//     const theaterIds = theaters.map((t) => t.id);
//     const halls = await db.Hall.findAll({
//       where: { theaterId: { [Op.in]: theaterIds } },
//       include: [{ model: db.Theater }],
//     });
//     res.json({ halls });
//   } catch (e) {
//     next(e);
//   }
// }

// const createShowSchema = z.object({
//   hallId: z.coerce.number().int().positive(),
//   movieId: z.coerce.number().int().positive(),
//   date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
//   startTime: z.string().regex(/^\d{2}:\d{2}$/),
//   durationMins: z.coerce.number().int().positive().max(480),
//   language: z.string().min(1).max(40),
//   seatPrices: z
//     .array(
//       z.object({
//         seatTypeCode: z.string().min(1).max(40),
//         price: z.coerce.number().positive(),
//       })
//     )
//     .min(1, 'At least one seat price is required'),
// });

// async function createShow(req, res, next) {
//   const t = await db.sequelize.transaction();
//   try {
//     const body = createShowSchema.parse(req.body);

//     const hall = await db.Hall.findByPk(body.hallId, {
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//       include: [{ model: db.Theater }],
//     });
//     if (!hall || String(hall.Theater.ownerUserId) !== String(req.user.id)) {
//       throw new HttpError(404, 'Hall not found');
//     }

//     const startsAt = new Date(`${body.date}T${body.startTime}:00.000Z`);
//     const endsAt = new Date(startsAt.getTime() + Number(body.durationMins) * 60 * 1000);
//     if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
//       throw new HttpError(400, 'Invalid show time');
//     }

//     const bufferMins = 30;
//     const bufferedStart = new Date(startsAt.getTime() - bufferMins * 60 * 1000);
//     const bufferedEnd = new Date(endsAt.getTime() + bufferMins * 60 * 1000);

//     const conflicts = await db.Show.count({
//       where: {
//         hallId: hall.id,
//         isCancelled: false,
//         startsAt: { [Op.lt]: bufferedEnd },
//         endsAt: { [Op.gt]: bufferedStart },
//       },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });
//     if (conflicts > 0) throw new HttpError(409, 'Show conflicts with existing timeline (30 min buffer)');

//     const show = await db.Show.create(
//       {
//         hallId: hall.id,
//         movieId: body.movieId,
//         startsAt: startsAt.toISOString(),
//         endsAt: endsAt.toISOString(),
//         language: body.language,
//         isApproved: false,
//         approvedAt: null,
//       },
//       { transaction: t }
//     );

//     if (body.seatPrices?.length) {
//       const seatTypes = await db.SeatType.findAll({ transaction: t });
//       const byCode = new Map(seatTypes.map((s) => [String(s.code).toLowerCase(), s]));

//       const seenCodes = new Set();
//       for (const sp of body.seatPrices) {
//         const seatTypeCode = String(sp.seatTypeCode).trim().toLowerCase();
//         if (seenCodes.has(seatTypeCode)) {
//           throw new HttpError(400, `Duplicate seat type: ${sp.seatTypeCode}`);
//         }
//         seenCodes.add(seatTypeCode);

//         const st = byCode.get(seatTypeCode);
//         if (!st) throw new HttpError(400, `Unknown seat type: ${sp.seatTypeCode}`);
//         if (Number(sp.price) > Number(st.adminPriceCap)) {
//           throw new HttpError(400, `Price exceeds admin cap for ${st.code}`);
//         }
//         await db.ShowSeatPrice.create(
//           { showId: show.id, seatTypeId: st.id, price: sp.price },
//           { transaction: t }
//         );
//       }
//     }

//     await t.commit();
//     res.status(201).json({ show });
//   } catch (e) {
//     await t.rollback();
//     if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
//     return next(e);
//   }
// }

// async function revenueSummary(req, res, next) {
//   try {
//     const theaters = await db.Theater.findAll({ where: { ownerUserId: req.user.id } });
//     const theaterIds = theaters.map((t) => t.id);
//     const halls = theaterIds.length
//       ? await db.Hall.findAll({ where: { theaterId: { [Op.in]: theaterIds } } })
//       : [];
//     const hallIds = halls.map((h) => h.id);
//     const shows = hallIds.length ? await db.Show.findAll({ where: { hallId: { [Op.in]: hallIds } } }) : [];
//     const showIds = shows.map((s) => s.id);

//     const bookings = showIds.length
//       ? await db.Booking.findAll({
//           where: {
//             showId: { [Op.in]: showIds },
//             status: db.BOOKING_STATUS.CONFIRMED,
//           },
//         })
//       : [];
//     const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
//     res.json({ totalRevenue });
//   } catch (e) {
//     next(e);
//   }
// }

// module.exports = {
//   createTheater,
//   listMyTheaters,
//   createHallWithLayout,
//   listMyHalls,
//   createShow,
//   revenueSummary,
// };




const { z } = require('zod');
const { Op } = require('sequelize');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');
const { buildPaginationMeta, parsePagination } = require('../utils/pagination');
const { serializeMovieWithLanguages } = require('../utils/movieLanguages');

const NAME_REGEX = /^[A-Za-z ]+$/;
const PINCODE_REGEX = /^\d{6}$/;

const createTheaterSchema = z.object({
  name: z.string().trim().min(1).max(160).regex(NAME_REGEX, 'Name can contain only alphabets and spaces'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(255),
  city: z.string().trim().min(1).max(120).regex(NAME_REGEX, 'City can contain only alphabets and spaces'),
  state: z.string().trim().min(1).max(120).regex(NAME_REGEX, 'State can contain only alphabets and spaces'),
  pincode: z.string().trim().regex(PINCODE_REGEX, 'Pincode must be exactly 6 digits'),
  amenities: z.string().trim().max(5000).optional().or(z.literal('')),
});

const updateTheaterSchema = z.object({
  amenities: z.string().trim().max(5000).optional().or(z.literal('')),
});

const revenueQuerySchema = z.object({
  range: z.enum(['today', 'last7', 'last30', 'custom']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  theaterId: z.coerce.number().int().positive().optional(),
  movieId: z.coerce.number().int().positive().optional(),
  city: z.string().trim().min(1).max(120).optional(),
  showTime: z.enum(['Morning', 'Afternoon', 'Evening', 'Night']).optional(),
});

function wallClockUtc(date, time = '00:00') {
  const [year, month, day] = String(date).split('-').map(Number);
  const [hour, minute] = String(time).split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}

function buildTheaterAddress({ address, state, pincode, amenities }) {
  const parts = [address, state, pincode].filter(Boolean);
  if (amenities) parts.push(`Amenities: ${amenities}`);
  return parts.join(', ');
}

function buildMovieFilters(query) {
  const and = [];

  if (String(query.name ?? '').trim()) {
    and.push(
      db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('title')), {
        [Op.like]: `%${String(query.name).trim().toLowerCase()}%`,
      })
    );
  }

  if (String(query.genre ?? '').trim()) {
    and.push(
      db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('genre')), {
        [Op.like]: `%${String(query.genre).trim().toLowerCase()}%`,
      })
    );
  }

  if (String(query.releaseDate ?? '').trim()) {
    and.push(
      db.sequelize.where(
        db.sequelize.fn('DATE_FORMAT', db.sequelize.col('release_date'), '%Y-%m-%d'),
        { [Op.like]: `%${String(query.releaseDate).trim()}%` }
      )
    );
  }

  const where = { isActive: true };
  if (and.length) where[Op.and] = and;
  return where;
}

function buildTheaterFilters(query, ownerUserId) {
  const and = [{ ownerUserId }];

  if (String(query.name ?? '').trim()) {
    and.push(
      db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('name')), {
        [Op.like]: `%${String(query.name).trim().toLowerCase()}%`,
      })
    );
  }

  if (String(query.city ?? '').trim()) {
    and.push(
      db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('city')), {
        [Op.like]: `%${String(query.city).trim().toLowerCase()}%`,
      })
    );
  }

  if (String(query.state ?? '').trim()) {
    and.push(
      db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('address')), {
        [Op.like]: `%${String(query.state).trim().toLowerCase()}%`,
      })
    );
  }

  if (String(query.pincode ?? '').trim()) {
    and.push(
      db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('address')), {
        [Op.like]: `%${String(query.pincode).trim().toLowerCase()}%`,
      })
    );
  }

  return { [Op.and]: and };
}

async function createTheater(req, res, next) {
  try {
    const body = createTheaterSchema.parse(req.body);
    const fullAddress = buildTheaterAddress(body);
    const theater = await db.Theater.create({
      ownerUserId: req.user.id,
      name: body.name,
      address: fullAddress,
      city: body.city,
      // Reuse the existing flag as an approval gate to avoid schema changes.
      isBlocked: true,
    });
    res.status(201).json({ theater });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function listMyTheaters(req, res, next) {
  try {
    const where = buildTheaterFilters(req.query, req.user.id);
    const { page, limit, offset, hasPagination } = parsePagination(req.query, {
      defaultLimit: 5,
      maxLimit: 20,
    });

    const total = await db.Theater.count({ where });
    const options = {
      where,
      order: [['createdAt', 'DESC']],
    };

    if (hasPagination) {
      options.limit = limit;
      options.offset = offset;
    }

    const theaters = await db.Theater.findAll(options);
    res.json({
      theaters,
      pagination: buildPaginationMeta(total, { page, limit, hasPagination }),
    });
  } catch (e) {
    next(e);
  }
}

async function updateTheater(req, res, next) {
  try {
    const theaterId = Number(req.params.theaterId);
    if (!Number.isInteger(theaterId) || theaterId <= 0) {
      throw new HttpError(400, 'Invalid theater id');
    }

    const body = updateTheaterSchema.parse(req.body);
    const theater = await db.Theater.findByPk(theaterId);
    if (!theater || String(theater.ownerUserId) !== String(req.user.id)) {
      throw new HttpError(404, 'Theater not found');
    }

    const addressParts = String(theater.address)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !part.startsWith('Amenities: '));
    const fullAddress = buildTheaterAddress({
      address: addressParts[0] ?? theater.address,
      state: addressParts[1] ?? '',
      pincode: addressParts[2] ?? '',
      amenities: body.amenities ?? '',
    });

    await theater.update({
      address: fullAddress,
    });

    res.json({ theater });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function deleteTheater(req, res, next) {
  try {
    const theaterId = Number(req.params.theaterId);
    if (!Number.isInteger(theaterId) || theaterId <= 0) {
      throw new HttpError(400, 'Invalid theater id');
    }

    const theater = await db.Theater.findByPk(theaterId);
    if (!theater || String(theater.ownerUserId) !== String(req.user.id)) {
      throw new HttpError(404, 'Theater not found');
    }

    await theater.destroy();
    res.json({ ok: true });
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

function countSeatTypes(layout) {
  const counts = {
    gold: 0,
    silver: 0,
    platinum: 0,
  };

  if (!layout?.typedSegmentsByRow || !Array.isArray(layout.typedSegmentsByRow)) {
    return counts;
  }

  for (const row of layout.typedSegmentsByRow) {
    if (!Array.isArray(row)) continue;

    for (const segment of row) {
      if (!segment) continue;

      const start = Number(segment.start);
      const end = Number(segment.end);
      if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) continue;

      const seats = end - start + 1;
      const type = String(segment.type || '').trim().toLowerCase();

      // Map existing seat types into the requested business labels.
      if (type === 'premium') counts.gold += seats;
      else if (type === 'standard') counts.silver += seats;
      else if (type === 'vip' || type === 'recliner') counts.platinum += seats;
    }
  }

  return counts;
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
      // Manage Halls should only expose admin-approved halls.
      where: { theaterId, isApproved: true, isBlocked: false },
      include: [{ model: db.HallLayout }],
      order: [['name', 'ASC']],
    });

    res.json({
      theater,
      halls: halls.map((hall) => ({
        ...hall.toJSON(),
        seatingCapacity: countLayoutSeats(hall.HallLayout),
        seatTypeCounts: countSeatTypes(hall.HallLayout),
      })),
    });
  } catch (e) {
    next(e);
  }
}

async function listMyMovies(req, res, next) {
  try {
    const where = buildMovieFilters(req.query);
    const { page, limit, offset, hasPagination } = parsePagination(req.query, {
      defaultLimit: 5,
      maxLimit: 20,
    });

    const total = await db.Movie.count({ where });
    const options = {
      where,
      include: [{ model: db.MovieLanguage, required: false }],
      order: [['title', 'ASC']],
    };

    if (hasPagination) {
      options.limit = limit;
      options.offset = offset;
    }

    const movies = await db.Movie.findAll(options);

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
        ...serializeMovieWithLanguages(movie),
        addedAt: movie.createdAt,
        showCount: showCountByMovieId.get(String(movie.id)) ?? 0,
      })),
      pagination: buildPaginationMeta(total, { page, limit, hasPagination }),
    });
  } catch (e) {
    next(e);
  }
}

function endOfUtcDay(date) {
  const value = wallClockUtc(date, '23:59');
  value.setUTCSeconds(59, 999);
  return value;
}

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function shiftUtcDate(date, days) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function buildDateKeys(startAt, endAt) {
  if (!startAt || !endAt) return [];

  const keys = [];
  const cursor = new Date(startAt);
  cursor.setUTCHours(0, 0, 0, 0);

  const finish = new Date(endAt);
  finish.setUTCHours(0, 0, 0, 0);

  while (cursor <= finish) {
    keys.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

function resolveRevenueWindow(query) {
  if (query.startDate && query.endDate) {
    if (query.startDate > query.endDate) {
      throw new HttpError(400, 'Start date cannot be after end date');
    }

    return {
      startDate: query.startDate,
      endDate: query.endDate,
      startAt: wallClockUtc(query.startDate, '00:00'),
      endAt: endOfUtcDay(query.endDate),
      range: query.range || 'custom',
    };
  }

  if (!query.range) return null;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  if (query.range === 'today') {
    return {
      startDate: todayKey,
      endDate: todayKey,
      startAt: wallClockUtc(todayKey, '00:00'),
      endAt: endOfUtcDay(todayKey),
      range: query.range,
    };
  }

  const daysBack = query.range === 'last7' ? 6 : 29;
  const endAt = endOfUtcDay(todayKey);
  const startAt = wallClockUtc(toDateKey(shiftUtcDate(endAt, -daysBack)), '00:00');

  return {
    startDate: toDateKey(startAt),
    endDate: todayKey,
    startAt,
    endAt,
    range: query.range,
  };
}

function peakBucketLabel(hour) {
  if (hour >= 6 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 22) return 'Evening';
  return 'Night';
}

function matchesShowTimeFilter(dateValue, showTime) {
  if (!showTime) return true;
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) return false;
  return peakBucketLabel(value.getUTCHours()) === showTime;
}

async function sumPeriodMetrics({ showIds, startAt, endAt }) {
  if (!showIds.length || !startAt || !endAt) {
    return { revenue: 0, ticketsSold: 0 };
  }

  const bookings = await db.Booking.findAll({
    attributes: ['totalAmount'],
    where: {
      showId: { [Op.in]: showIds },
      status: db.BOOKING_STATUS.CONFIRMED,
      createdAt: { [Op.gte]: startAt, [Op.lte]: endAt },
    },
    include: [{ model: db.BookingSeat, required: false, attributes: ['id'] }],
  });

  return bookings.reduce(
    (summary, booking) => {
      summary.revenue += Number(booking.totalAmount || 0);
      summary.ticketsSold += booking.BookingSeats?.length ?? 0;
      return summary;
    },
    { revenue: 0, ticketsSold: 0 }
  );
}

function buildDailyMetricSeries(keys, values, keyName) {
  return keys.map((date) => ({
    date,
    [keyName]: values.get(date) ?? 0,
  }));
}

async function sumRevenueForWindow({ showIds, startAt, endAt }) {
  if (!showIds.length || !startAt || !endAt) return 0;

  const bookingWhere = {
    showId: { [Op.in]: showIds },
    status: db.BOOKING_STATUS.CONFIRMED,
    createdAt: { [Op.gte]: startAt, [Op.lte]: endAt },
  };

  if (!showIds.length) return 0;

  const bookings = await db.Booking.findAll({
    attributes: ['totalAmount'],
    where: bookingWhere,
  });

  return bookings.reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
}

const listShowsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  theaterId: z.coerce.number().int().positive().optional(),
  hallId: z.coerce.number().int().positive().optional(),
  movieId: z.coerce.number().int().positive().optional(),
});

async function listMyShows(req, res, next) {
  try {
    const query = listShowsSchema.parse(req.query);
    const { page, limit, offset, hasPagination } = parsePagination(req.query, {
      defaultLimit: 6,
      maxLimit: 20,
    });

    const hallWhere = {};
    if (query.hallId) hallWhere.id = query.hallId;
    if (query.theaterId) hallWhere.theaterId = query.theaterId;

    const showWhere = {
      isCancelled: false,
    };
    if (query.date) {
      const startOfDay = wallClockUtc(query.date, '00:00');
      const endOfDay = wallClockUtc(query.date, '23:59');
      showWhere.startsAt = { [Op.lte]: endOfDay };
      showWhere.endsAt = { [Op.gte]: startOfDay };
    }
    if (query.movieId) showWhere.movieId = query.movieId;

    const include = [
      {
        model: db.Hall,
        required: true,
        // Only approved, active halls should be visible in scheduled shows.
        where: { ...hallWhere, isApproved: true, isBlocked: false },
        include: [
          {
            model: db.Theater,
            required: true,
            where: { ownerUserId: req.user.id, isBlocked: false },
          },
        ],
      },
      { model: db.Movie, required: true },
    ];

    const total = await db.Show.count({
      where: showWhere,
      include,
      distinct: true,
      col: 'id',
    });

    const options = {
      where: showWhere,
      include,
      order: [['startsAt', 'ASC']],
    };

    if (!query.date && hasPagination) {
      options.limit = limit;
      options.offset = offset;
    }

    const shows = await db.Show.findAll(options);

    res.json({
      shows: shows.map((show) => ({
        id: show.id,
        movieId: show.movieId,
        movieTitle: show.Movie.title,
        hallId: show.Hall.id,
        hallName: show.Hall.name,
        theaterId: show.Hall.Theater.id,
        theaterName: show.Hall.Theater.name,
        startsAt: show.startsAt,
        endsAt: show.endsAt,
        language: show.language,
      })),
      pagination: buildPaginationMeta(total, {
        page: query.date ? 1 : page,
        limit: query.date ? total || limit : limit,
        hasPagination: !query.date && hasPagination,
      }),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

const createHallSchema = z.object({
  theaterId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(120),
  screenType: z.string().min(1).max(40).optional(),
  facilities: z.array(z.string().min(1).max(80)).max(30).optional(),
  images: z.array(z.string().url().max(500)).max(20).optional(),
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
  for (let r = 0; r < segmentsByRow.length; r += 1) {
    const row = segmentsByRow[r];
    if (!Array.isArray(row)) throw new HttpError(400, `Row ${r} segments must be an array`);
    if (row.length % 2 !== 0) throw new HttpError(400, `Row ${r} segments must be pairs`);

    for (let i = 0; i < row.length; i += 2) {
      const start = row[i];
      const end = row[i + 1];

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new HttpError(400, `Row ${r} segment values must be integers`);
      }
      if (start > end) throw new HttpError(400, `Row ${r} segment start > end`);
      if (i > 0 && start <= row[i - 1]) throw new HttpError(400, `Row ${r} segments must increase`);
    }
  }
}

function toUtcDate(dateStr, timeStr) {
  const d = new Date(`${dateStr}T${timeStr}:00.000Z`);
  return d;
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
      {
        theaterId: theater.id,
        name: body.name,
        screenType: body.screenType ?? null,
        facilities: body.facilities?.length ? body.facilities : null,
        images: body.images?.length ? body.images : null,
        isApproved: false,
        approvedAt: null,
      },
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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMins: z.coerce.number().int().positive().max(480).optional(),
  language: z.string().trim().min(1).max(40),
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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
    const endOfNextDay = new Date(startOfDay);
    endOfNextDay.setUTCDate(endOfNextDay.getUTCDate() + 1);

    const shows = await db.Show.findAll({
      where: {
        hallId: hall.id,
        isCancelled: false,
        startsAt: { [Op.lt]: endOfNextDay },
        endsAt: { [Op.gt]: startOfDay },
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
      bufferStart: new Date(new Date(show.startsAt).getTime() - bufferMins * 60 * 1000),
      bufferEnd: new Date(new Date(show.endsAt).getTime() + bufferMins * 60 * 1000),
    }));

    res.json({ schedule, bufferMins });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

// async function createShow(req, res, next) {
//   const t = await db.sequelize.transaction();
//   try {
//     const body = createShowSchema.parse(req.body);

//     const hall = await db.Hall.findByPk(body.hallId, {
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//       include: [{ model: db.Theater }],
//     });
//     if (!hall || String(hall.Theater.ownerUserId) !== String(req.user.id)) {
//       throw new HttpError(404, 'Hall not found');
//     }

//     // Calculate startsAt and endsAt from date, startTime, and durationMins
//     const startsAt = dayjs(`${body.date} ${body.startTime}`, 'YYYY-MM-DD HH:mm');
//     const endsAt = startsAt.add(body.durationMins, 'minute');

//     if (!startsAt.isValid() || !endsAt.isValid() || !endsAt.isAfter(startsAt)) {
//       throw new HttpError(400, 'Invalid show time');
//     }

//     const bufferMins = 30;
//     const bufferedStart = startsAt.subtract(bufferMins, 'minute').toDate();
//     const bufferedEnd = endsAt.add(bufferMins, 'minute').toDate();

//     const conflicts = await db.Show.count({
//       where: {
//         hallId: hall.id,
//         isCancelled: false,
//         startsAt: { [Op.lt]: bufferedEnd },
//         endsAt: { [Op.gt]: bufferedStart },
//       },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });
//     if (conflicts > 0) throw new HttpError(409, 'Show conflicts with existing timeline (30 min buffer)');

//     const show = await db.Show.create(
//       {
//         hallId: hall.id,
//         movieId: body.movieId,
//         startsAt: startsAt.toDate(),
//         endsAt: endsAt.toDate(),
//         language: body.language,
//         isApproved: false,
//       },
//       { transaction: t }
//     );

//     if (body.seatPrices?.length) {
//       const seatTypes = await db.SeatType.findAll({ transaction: t });
//       const byCode = new Map(seatTypes.map((s) => [s.code, s]));
//       for (const sp of body.seatPrices) {
//         const st = byCode.get(sp.seatTypeCode);
//         if (!st) throw new HttpError(400, `Unknown seat type: ${sp.seatTypeCode}`);
//         // if (Number(sp.price) > Number(st.adminPriceCap)) {
//         //   throw new HttpError(400, `Price exceeds admin cap for ${st.code}`);
//         // }
        
    
//         await db.ShowSeatPrice.create(
//           { showId: show.id, seatTypeId: st.id, price: sp.price },
//           { transaction: t }
//         );
//       }
//     }

//     await t.commit();
//     res.status(201).json({ show });
//   } catch (e) {
//     await t.rollback();
//     if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
//     return next(e);
//   }
// }
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
    if (!hall.isApproved) {
      throw new HttpError(400, 'Hall is not approved yet');
    }

    const movie = await db.Movie.findByPk(body.movieId, { transaction: t });
    if (!movie || !movie.isActive) {
      throw new HttpError(404, 'Movie not found');
    }

    const releaseDate = new Date(movie.releaseDate).toISOString().slice(0, 10);
    if (body.date < releaseDate) {
      throw new HttpError(400, 'Cannot schedule a show before the movie release date');
    }

    const showDate = new Date(`${body.date}T00:00:00`);
    if (Number.isNaN(showDate.getTime())) {
      throw new HttpError(400, 'Invalid date');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999);

    if (showDate < today) {
      throw new HttpError(400, 'Cannot schedule show in the past');
    }
    if (showDate > maxDate) {
      throw new HttpError(400, 'Shows can only be scheduled within next 7 days');
    }

    const durationMins = Number(movie.durationMins || body.durationMins);
    if (!Number.isFinite(durationMins) || durationMins <= 0 || durationMins > 480) {
      throw new HttpError(400, 'Invalid show duration');
    }

    const startsAt = wallClockUtc(body.date, body.startTime);
    const endsAt = new Date(startsAt.getTime() + durationMins * 60_000);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new HttpError(400, 'Invalid show time');
    }
    if (startsAt.getTime() < Date.now()) {
      throw new HttpError(400, 'Cannot schedule show in the past');
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
    if (conflicts > 0) {
      throw new HttpError(409, 'Show conflicts with existing timeline (30 min buffer)');
    }

    const show = await db.Show.create(
      {
        hallId: hall.id,
        movieId: body.movieId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        language: body.language,
        isApproved: false,
        approvedAt: null,
      },
      { transaction: t }
    );

    const seatPrices = Array.isArray(body.seatPrices) ? body.seatPrices : [];
    if (seatPrices.length) {
      const seatTypes = await db.SeatType.findAll({ transaction: t });
      const byCode = new Map(seatTypes.map((seatType) => [String(seatType.code).toLowerCase(), seatType]));
      const hallCaps = await db.HallSeatCap.findAll({
        where: { hallId: hall.id },
        include: [{ model: db.SeatType }],
        transaction: t,
      });
      const capByType = new Map(
        hallCaps
          .filter((cap) => cap?.SeatType?.code)
          .map((cap) => [String(cap.SeatType.code).toLowerCase(), Number(cap.priceCap)])
      );

      const seenCodes = new Set();
      for (const seatPrice of seatPrices) {
        const seatTypeCode = String(seatPrice.seatTypeCode).trim().toLowerCase();
        if (seenCodes.has(seatTypeCode)) {
          throw new HttpError(400, `Duplicate seat type: ${seatPrice.seatTypeCode}`);
        }
        seenCodes.add(seatTypeCode);

        const seatType = byCode.get(seatTypeCode);
        if (!seatType) throw new HttpError(400, `Unknown seat type: ${seatPrice.seatTypeCode}`);

        const cap = capByType.get(seatTypeCode);
        if (cap === undefined || cap === null) {
          throw new HttpError(400, `Hall is not approved with seat caps for ${seatType.code}`);
        }

        const price = Number(seatPrice.price);
        if (!Number.isFinite(price) || price <= 0) {
          throw new HttpError(400, `Invalid price for ${seatType.code}`);
        }
        if (price > cap) {
          throw new HttpError(400, 'Price exceeds admin cap for this seat type');
        }

        await db.ShowSeatPrice.create(
          {
            showId: show.id,
            seatTypeId: seatType.id,
            price,
          },
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
    const query = revenueQuerySchema.parse(req.query);
    const window = resolveRevenueWindow(query);

    const allTheaters = await db.Theater.findAll({
      where: { ownerUserId: req.user.id },
      order: [['name', 'ASC']],
    });
    const ownedTheaterIds = allTheaters.map((theater) => theater.id);

    if (query.theaterId && !ownedTheaterIds.includes(query.theaterId)) {
      throw new HttpError(404, 'Theater not found');
    }

    const filteredTheaterIds = query.theaterId ? [query.theaterId] : ownedTheaterIds;
    const halls = filteredTheaterIds.length
      ? await db.Hall.findAll({
          where: { theaterId: { [Op.in]: filteredTheaterIds }, isApproved: true, isBlocked: false },
          include: [{ model: db.HallLayout }],
          order: [['name', 'ASC']],
        })
      : [];
    const hallIds = halls.map((hall) => hall.id);

    const filterMovieRows = hallIds.length
      ? await db.Show.findAll({
          attributes: ['movieId'],
          where: { hallId: { [Op.in]: hallIds }, isCancelled: false },
          group: ['movieId'],
        })
      : [];
    const filterMovieIds = filterMovieRows.map((row) => row.movieId);
    const filterMovies = filterMovieIds.length
      ? await db.Movie.findAll({
          where: { id: { [Op.in]: filterMovieIds } },
          include: [{ model: db.MovieLanguage, required: false }],
          order: [['title', 'ASC']],
        })
      : [];

    const rawShowWhere = {
      hallId: { [Op.in]: hallIds },
      isCancelled: false,
      isApproved: true,
      isBlocked: false,
    };
    if (query.movieId) rawShowWhere.movieId = query.movieId;

    const rawShows = hallIds.length
      ? await db.Show.findAll({
          where: rawShowWhere,
          include: [
            {
              model: db.Hall,
              required: true,
              where: { isApproved: true, isBlocked: false },
              include: [{ model: db.Theater, required: true, where: { isBlocked: false } }],
            },
            { model: db.Movie, required: true, include: [{ model: db.MovieLanguage, required: false }] },
          ],
          order: [['startsAt', 'ASC']],
        })
      : [];
    const shows = rawShows.filter((show) => {
      const city = String(show.Hall?.Theater?.city || '').trim().toLowerCase();
      const cityMatches = query.city ? city === String(query.city).trim().toLowerCase() : true;
      const showTimeMatches = matchesShowTimeFilter(show.startsAt, query.showTime);
      return cityMatches && showTimeMatches;
    });
    const showIds = shows.map((show) => show.id);

    const bookings = showIds.length
      ? await db.Booking.findAll({
          where: {
            showId: { [Op.in]: showIds },
            status: db.BOOKING_STATUS.CONFIRMED,
            ...(window ? { createdAt: { [Op.gte]: window.startAt, [Op.lte]: window.endAt } } : {}),
          },
          include: [
            { model: db.User, required: false, attributes: ['id', 'name', 'email'] },
            { model: db.BookingSeat, required: false },
          ],
          order: [['createdAt', 'DESC']],
        })
      : [];

    const hallById = new Map(
      halls.map((hall) => [
        String(hall.id),
        {
          ...hall.toJSON(),
          seatingCapacity: countLayoutSeats(hall.HallLayout) ?? 0,
        },
      ])
    );

    const theaterBreakdownMap = new Map();
    const moviePerformanceMap = new Map();
    const showMetaById = new Map();
    const revenueOverTimeMap = new Map();
    const ticketsPerDayMap = new Map();
    const revenueByMovieMap = new Map();
    const peakTimeBuckets = new Map([
      ['Morning', 0],
      ['Afternoon', 0],
      ['Evening', 0],
      ['Night', 0],
    ]);
    let weekendRevenue = 0;
    let weekdayRevenue = 0;
    let weekendBookings = 0;
    let weekdayBookings = 0;

    for (const show of shows) {
      const hall = hallById.get(String(show.hallId));
      const theater = show.Hall?.Theater;
      const movie = show.Movie;
      const seatingCapacity = hall?.seatingCapacity ?? 0;
      if (!theaterBreakdownMap.has(String(theater.id))) {
        theaterBreakdownMap.set(String(theater.id), {
          theaterId: theater.id,
          theaterName: theater.name,
          city: theater.city,
          grossRevenue: 0,
          bookingCount: 0,
          ticketsSold: 0,
          totalSeatsAvailable: 0,
          occupancyPct: 0,
          averageTicketPrice: 0,
          shows: [],
        });
      }

      if (!moviePerformanceMap.has(String(movie.id))) {
        moviePerformanceMap.set(String(movie.id), {
          movieId: movie.id,
          movieName: movie.title,
          languages: serializeMovieWithLanguages(movie).languages,
          ticketsSold: 0,
          revenue: 0,
          totalSeatsAvailable: 0,
          occupancyPct: 0,
          showCount: 0,
        });
      }

      const theaterRow = theaterBreakdownMap.get(String(theater.id));
      const movieRow = moviePerformanceMap.get(String(movie.id));
      const showRow = {
        showId: show.id,
        movieId: movie.id,
        movieName: movie.title,
        hallName: show.Hall?.name ?? hall?.name ?? 'Unknown hall',
        startsAt: show.startsAt,
        language: show.language,
        ticketsSold: 0,
        grossRevenue: 0,
        totalSeatsAvailable: seatingCapacity,
        occupancyPct: 0,
        averageTicketPrice: 0,
      };

      theaterRow.totalSeatsAvailable += seatingCapacity;
      theaterRow.shows.push(showRow);
      movieRow.totalSeatsAvailable += seatingCapacity;
      movieRow.showCount += 1;
      showMetaById.set(String(show.id), { show, theaterRow, movieRow, showRow });
    }

    const recentBookings = bookings
      .map((booking) => {
        const meta = showMetaById.get(String(booking.showId));
        if (!meta) return null;

        const ticketCount = booking.BookingSeats?.length ?? 0;
        const amount = Number(booking.totalAmount);
        const peakBucket = peakBucketLabel(new Date(meta.show.startsAt).getUTCHours());
        const bookingDateKey = toDateKey(booking.createdAt);

        meta.showRow.ticketsSold += ticketCount;
        meta.showRow.grossRevenue += amount;
        meta.theaterRow.grossRevenue += amount;
        meta.theaterRow.bookingCount += 1;
        meta.theaterRow.ticketsSold += ticketCount;
        meta.movieRow.revenue += amount;
        meta.movieRow.ticketsSold += ticketCount;

        revenueOverTimeMap.set(
          bookingDateKey,
          (revenueOverTimeMap.get(bookingDateKey) ?? 0) + amount
        );
        ticketsPerDayMap.set(
          bookingDateKey,
          (ticketsPerDayMap.get(bookingDateKey) ?? 0) + ticketCount
        );

        const movieRevenueRow = revenueByMovieMap.get(String(meta.show.Movie.id)) ?? {
          movieId: meta.show.Movie.id,
          movieName: meta.show.Movie.title,
          revenue: 0,
          ticketsSold: 0,
        };
        movieRevenueRow.revenue += amount;
        movieRevenueRow.ticketsSold += ticketCount;
        revenueByMovieMap.set(String(meta.show.Movie.id), movieRevenueRow);

        peakTimeBuckets.set(peakBucket, (peakTimeBuckets.get(peakBucket) ?? 0) + ticketCount);

        return {
          bookingId: booking.id,
          showId: booking.showId,
          user: booking.User?.name ?? 'Guest user',
          userEmail: booking.User?.email ?? '',
          movie: meta.show.Movie.title,
          movieId: meta.show.Movie.id,
          theater: meta.show.Hall?.Theater?.name ?? meta.theaterRow.theaterName,
          theaterName: meta.show.Hall?.Theater?.name ?? meta.theaterRow.theaterName,
          hall: meta.show.Hall?.name ?? meta.showRow.hallName,
          seats: (booking.BookingSeats || [])
            .map((seat) => seat.seatCode)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
          amount,
          totalAmount: amount,
          createdAt: booking.createdAt,
          language: meta.show.language,
          peakTime: peakBucket,
          city: meta.show.Hall?.Theater?.city ?? '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalRevenue = bookings.reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
    const soldTickets = bookings.reduce((sum, booking) => sum + (booking.BookingSeats?.length ?? 0), 0);
    const totalSeats = Array.from(showMetaById.values()).reduce(
      (sum, meta) => sum + (meta.showRow.totalSeatsAvailable ?? 0),
      0
    );
    const averageTicketPrice = soldTickets ? totalRevenue / soldTickets : 0;
    const occupancyRate = totalSeats ? (soldTickets / totalSeats) * 100 : 0;

    const theaterBreakdown = Array.from(theaterBreakdownMap.values())
      .map((row) => {
        row.occupancyPct = row.totalSeatsAvailable
          ? (row.ticketsSold / row.totalSeatsAvailable) * 100
          : 0;
        row.averageTicketPrice = row.ticketsSold ? row.grossRevenue / row.ticketsSold : 0;
        row.shows = row.shows
          .map((showRow) => ({
            ...showRow,
            occupancyPct: showRow.totalSeatsAvailable
              ? (showRow.ticketsSold / showRow.totalSeatsAvailable) * 100
              : 0,
            averageTicketPrice: showRow.ticketsSold
              ? showRow.grossRevenue / showRow.ticketsSold
              : 0,
          }))
          .filter((showRow) => showRow.ticketsSold > 0 || showRow.grossRevenue > 0)
          .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
        return row;
      })
      .filter((row) => row.ticketsSold > 0 || row.grossRevenue > 0)
      .sort((a, b) => b.grossRevenue - a.grossRevenue);

    const breakdown = theaterBreakdown.map((row) => ({
      theaterId: row.theaterId,
      theaterName: row.theaterName,
      city: row.city,
      totalRevenue: row.grossRevenue,
      bookingCount: row.bookingCount,
    }));

    const moviePerformance = Array.from(moviePerformanceMap.values())
      .map((row) => ({
        ...row,
        occupancyPct: row.totalSeatsAvailable
          ? (row.ticketsSold / row.totalSeatsAvailable) * 100
          : 0,
      }))
      .filter((row) => row.ticketsSold > 0 || row.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const revenueByMovie = Array.from(revenueByMovieMap.values()).sort((a, b) => b.revenue - a.revenue);
    const topPerformingMovie = revenueByMovie[0] || null;
    const topPerformingTheater = theaterBreakdown[0] || null;
    const lowPerformingTheaters = theaterBreakdown
      .filter((row) => row.grossRevenue > 0)
      .slice(-2)
      .map((row) => ({
        theaterId: row.theaterId,
        theaterName: row.theaterName,
        grossRevenue: row.grossRevenue,
      }));

    const dateKeys = window
      ? buildDateKeys(window.startAt, window.endAt)
      : Array.from(
          new Set([...revenueOverTimeMap.keys(), ...ticketsPerDayMap.keys()])
        ).sort((a, b) => a.localeCompare(b));

    let revenueChangePct = 0;
    let ticketsSoldChangePct = 0;
    if (window) {
      const dayCount = Math.max(buildDateKeys(window.startAt, window.endAt).length, 1);
      const previousEnd = shiftUtcDate(window.startAt, -1);
      previousEnd.setUTCHours(23, 59, 59, 999);
      const previousStart = shiftUtcDate(previousEnd, -(dayCount - 1));
      previousStart.setUTCHours(0, 0, 0, 0);

      const previousPeriod = await sumPeriodMetrics({
        showIds,
        startAt: previousStart,
        endAt: previousEnd,
      });

      revenueChangePct = previousPeriod.revenue > 0
        ? ((totalRevenue - previousPeriod.revenue) / previousPeriod.revenue) * 100
        : totalRevenue > 0
          ? 100
          : 0;
      ticketsSoldChangePct = previousPeriod.ticketsSold > 0
        ? ((soldTickets - previousPeriod.ticketsSold) / previousPeriod.ticketsSold) * 100
        : soldTickets > 0
          ? 100
          : 0;
    }

    const peakTime = Array.from(peakTimeBuckets.entries()).sort((a, b) => b[1] - a[1])[0];
    const platformFee = totalRevenue * 0.05;
    const gst = totalRevenue * 0.18;
    const netEarnings = totalRevenue - platformFee - gst;
    const revenuePeakDay = buildDailyMetricSeries(dateKeys, revenueOverTimeMap, 'revenue')
      .sort((a, b) => b.revenue - a.revenue)[0] || null;
    const averageTicketsPerDay = dateKeys.length ? soldTickets / dateKeys.length : 0;

    for (const booking of recentBookings) {
      const bookingDate = new Date(booking.createdAt);
      const isWeekend = [0, 6].includes(bookingDate.getUTCDay());
      if (isWeekend) {
        weekendRevenue += Number(booking.amount || 0);
        weekendBookings += 1;
      } else {
        weekdayRevenue += Number(booking.amount || 0);
        weekdayBookings += 1;
      }
    }

    const weekendAverageRevenue = weekendBookings ? weekendRevenue / weekendBookings : 0;
    const weekdayAverageRevenue = weekdayBookings ? weekdayRevenue / weekdayBookings : 0;
    const weekendWeekdayRatio = weekdayAverageRevenue > 0
      ? weekendAverageRevenue / weekdayAverageRevenue
      : weekendAverageRevenue > 0
        ? Infinity
        : 0;
    const topMovieContributionPct = totalRevenue > 0 && topPerformingMovie
      ? (topPerformingMovie.revenue / totalRevenue) * 100
      : 0;

    res.json({
      totalRevenue,
      totalBookings: bookings.length,
      soldTickets,
      totalSeats,
      theaterCount: theaterBreakdown.length,
      breakdown,
      recentBookings,
      filters: {
        theaters: allTheaters.map((theater) => ({
          theaterId: theater.id,
          theaterName: theater.name,
        })),
        movies: filterMovies.map(serializeMovieWithLanguages).map((movie) => ({
          movieId: movie.id,
          movieName: movie.title,
          languages: movie.languages,
        })),
        cities: Array.from(
          new Set(
            allTheaters
              .map((theater) => String(theater.city || '').trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b)),
        showTimes: ['Morning', 'Afternoon', 'Evening', 'Night'],
      },
      appliedFilters: {
        range: window?.range || query.range || 'all',
        startDate: window?.startDate || null,
        endDate: window?.endDate || null,
        theaterId: query.theaterId ?? null,
        movieId: query.movieId ?? null,
        city: query.city ?? null,
        showTime: query.showTime ?? null,
      },
      selectedLabels: {
        theaterName:
          allTheaters.find((theater) => theater.id === query.theaterId)?.name ?? null,
        movieName:
          filterMovies.find((movie) => movie.id === query.movieId)?.title ?? null,
      },
      totals: {
        grossRevenue: totalRevenue,
        platformFee,
        gst,
        netEarnings,
        averageTicketPrice,
        occupancyRate,
      },
      charts: {
        revenueOverTime: buildDailyMetricSeries(dateKeys, revenueOverTimeMap, 'revenue'),
        ticketsSoldPerDay: buildDailyMetricSeries(dateKeys, ticketsPerDayMap, 'ticketsSold').map((row) => ({
          ...row,
          averageTickets: averageTicketsPerDay,
        })),
        revenueByMovie,
        revenuePeakDay,
      },
      moviePerformance,
      theaterBreakdown,
      kpis: {
        averageTicketPrice,
        occupancyRate,
        topPerformingTheater: topPerformingTheater
          ? {
              theaterId: topPerformingTheater.theaterId,
              theaterName: topPerformingTheater.theaterName,
              grossRevenue: topPerformingTheater.grossRevenue,
            }
          : null,
        topPerformingMovie,
      },
      comparisons: {
        revenueChangePct,
        ticketsSoldChangePct,
      },
      insights: {
        revenueChangePct,
        ticketsSoldChangePct,
        topPerformingMovie,
        peakTime: peakTime?.[1] ? peakTime[0] : 'No peak time yet',
        weekendWeekdayRatio,
        weekendRevenue,
        weekdayRevenue,
        topMovieContributionPct,
        lowPerformingTheaters,
      },
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    next(e);
  }
}

module.exports = {
  createTheater,
  listMyTheaters,
  updateTheater,
  deleteTheater,
  listTheaterHalls,
  listMyMovies,
  createHallWithLayout,
  listMyHalls,
  listMyShows,
  createShow,
  getHallSchedule,
  revenueSummary,
};
