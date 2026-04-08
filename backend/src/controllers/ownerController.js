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
//   date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
//   startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
//   durationMins: z.coerce.number().int().positive().max(480), // max 8 hours
//   language: z.string().min(1).max(40),
//   seatPrices: z
//     .array(
//       z.object({
//         seatTypeCode: z.string().min(1).max(40),
//         price: z.coerce.number().positive(),
//       })
//     )
//     .optional(),
// });

// const getHallScheduleSchema = z.object({
//   date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
// });

// async function getHallSchedule(req, res, next) {
//   try {
//     const { hallId } = req.params;
//     const { date } = getHallScheduleSchema.parse(req.query);

//     const hall = await db.Hall.findByPk(hallId, {
//       include: [{ model: db.Theater }],
//     });
//     if (!hall || String(hall.Theater.ownerUserId) !== String(req.user.id)) {
//       throw new HttpError(404, 'Hall not found');
//     }

//     const startOfDay = dayjs(`${date}T00:00:00.000Z`);
//     const endOfNextDay = dayjs(`${date}T23:59:59.999Z`).add(1, 'day');

//     const shows = await db.Show.findAll({
//       where: {
//         hallId: hall.id,
//         isCancelled: false,
//         startsAt: { [Op.lt]: endOfNextDay.toDate() },
//         endsAt: { [Op.gt]: startOfDay.toDate() },
//       },
//       include: [{ model: db.Movie }],
//       order: [['startsAt', 'ASC']],
//     });

//     const bufferMins = 30;
//     const schedule = shows.map(show => ({
//       id: show.id,
//       movieTitle: show.Movie.title,
//       startsAt: show.startsAt,
//       endsAt: show.endsAt,
//       language: show.language,
//       isApproved: show.isApproved,
//       bufferStart: dayjs(show.startsAt).subtract(bufferMins, 'minute').toDate(),
//       bufferEnd: dayjs(show.endsAt).add(bufferMins, 'minute').toDate(),
//     }));

//     res.json({ schedule, bufferMins });
//   } catch (e) {
//     if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
//     return next(e);
//   }
// }

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
//     const halls = await db.Hall.findAll({ where: { theaterId: { [Op.in]: theaterIds } } });
//     const hallIds = halls.map((h) => h.id);
//     const shows = await db.Show.findAll({ where: { hallId: { [Op.in]: hallIds } } });
//     const showIds = shows.map((s) => s.id);

//     const bookings = await db.Booking.findAll({ where: { showId: { [Op.in]: showIds } } });
//     const total = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

//     res.json({ totalRevenue: total });
//   } catch (e) {
//     next(e);
//   }
// }

// module.exports = {
//   createTheater,
//   listMyTheaters,
//   createHallWithLayout,
//   listMyHalls,
//   getHallSchedule,
//   createShow,
//   revenueSummary,
// };





const { z } = require('zod');
const { Op } = require('sequelize');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');

const createTheaterSchema = z.object({
  name: z.string().min(1).max(160),
  address: z.string().min(1).max(255),
  city: z.string().min(1).max(120),
});

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
        isApproved: true,
        approvedAt: new Date(),
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
  hallId: z.coerce.number().int().positive(),
  movieId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMins: z.coerce.number().int().positive().max(480),
  language: z.string().min(1).max(40),
  seatPrices: z
    .array(
      z.object({
        seatTypeCode: z.string().min(1).max(40),
        price: z.coerce.number().positive(),
      })
    )
    .optional(),
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

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfNextDay = new Date(`${date}T23:59:59.999Z`);
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

    const startsAt = toUtcDate(body.date, body.startTime);
    const endsAt = new Date(startsAt.getTime() + Number(body.durationMins) * 60 * 1000);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new HttpError(400, 'Invalid show time');
    }

    const bufferMins = 30;
    const bufferedStart = new Date(startsAt.getTime() - bufferMins * 60 * 1000);
    const bufferedEnd = new Date(endsAt.getTime() + bufferMins * 60 * 1000);

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

    const show = await db.Show.create(
      {
        hallId: hall.id,
        movieId: body.movieId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        language: body.language,
        isApproved: true,
        approvedAt: new Date(),
      },
      { transaction: t }
    );

    const seatPrices = Array.isArray(body.seatPrices) ? body.seatPrices : [];
    if (seatPrices.length) {
      const seatTypes = await db.SeatType.findAll({ transaction: t });
      const byCode = new Map(seatTypes.map((s) => [String(s.code).toLowerCase(), s]));

      const seenCodes = new Set();
      for (const sp of seatPrices) {
        const seatTypeCode = String(sp.seatTypeCode).trim().toLowerCase();
        if (seenCodes.has(seatTypeCode)) {
          throw new HttpError(400, `Duplicate seat type: ${sp.seatTypeCode}`);
        }
        seenCodes.add(seatTypeCode);

        const st = byCode.get(seatTypeCode);
        if (!st) throw new HttpError(400, `Unknown seat type: ${sp.seatTypeCode}`);

        const price = Number(sp.price);
        if (!Number.isFinite(price) || price <= 0) {
          throw new HttpError(400, `Invalid price for ${st.code}`);
        }

        if (price > Number(st.adminPriceCap)) {
          throw new HttpError(400, `Price exceeds admin cap for ${st.code}`);
        }

        await db.ShowSeatPrice.create(
          { showId: show.id, seatTypeId: st.id, price },
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
    const halls = await db.Hall.findAll({ where: { theaterId: { [Op.in]: theaterIds } } });
    const hallIds = halls.map((h) => h.id);
    const shows = await db.Show.findAll({ where: { hallId: { [Op.in]: hallIds } } });
    const showIds = shows.map((s) => s.id);

    const bookings = await db.Booking.findAll({ where: { showId: { [Op.in]: showIds } } });
    const total = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

    res.json({ totalRevenue: total });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createTheater,
  listMyTheaters,
  createHallWithLayout,
  listMyHalls,
  getHallSchedule,
  createShow,
  revenueSummary,
};
