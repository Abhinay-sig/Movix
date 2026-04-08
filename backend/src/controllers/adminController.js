const { z } = require('zod');
const { Op } = require('sequelize');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');

const createMovieSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200)
    .refine((val) => /[a-zA-Z0-9]/.test(val), {
      message: 'Title cannot be empty or only symbols',
    }),

  genre: z
    .string()
    .trim()
    .min(1, 'Genre is required')
    .max(120)
    .refine((val) => /[a-zA-Z0-9]/.test(val), {
      message: 'Genre cannot be empty or only symbols',
    }),

  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),

  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .or(z.literal('')),

  durationMins: z.coerce
    .number()
    .int()
    .positive('Duration must be > 0')
    .max(480, 'Max duration is 480 mins'),

  posterUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, { message: 'Invalid URL format' }),
});

async function pendingApprovals(req, res, next) {
  try {
    const halls = await db.Hall.findAll({
      where: { isApproved: false },
      include: [{ model: db.Theater }],
    });
    const shows = await db.Show.findAll({
      where: { isApproved: false },
      include: [{ model: db.Hall, include: [{ model: db.Theater }] }, { model: db.Movie }],
    });
    res.json({ halls, shows });
  } catch (e) {
    next(e);
  }
}

const approveHallSchema = z.object({ hallId: z.coerce.number().int().positive(), approve: z.boolean() });
async function approveHall(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = approveHallSchema.parse(req.body);
    const hall = await db.Hall.findByPk(body.hallId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!hall) throw new HttpError(404, 'Hall not found');
    if (body.approve) {
      await hall.update({ isApproved: true, approvedAt: new Date() }, { transaction: t });
    } else {
      await hall.destroy({ transaction: t });
    }
    await t.commit();
    res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

const approveShowSchema = z.object({ showId: z.coerce.number().int().positive(), approve: z.boolean() });
async function approveShow(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = approveShowSchema.parse(req.body);
    const show = await db.Show.findByPk(body.showId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!show) throw new HttpError(404, 'Show not found');
    if (body.approve) {
      await show.update({ isApproved: true, approvedAt: new Date() }, { transaction: t });
    } else {
      await show.destroy({ transaction: t });
    }
    await t.commit();
    res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

const blockSchema = z.object({
  entity: z.enum(['theater', 'hall', 'show']),
  id: z.coerce.number().int().positive(),
  blocked: z.boolean(),
});

async function setBlocked(req, res, next) {
  try {
    const body = blockSchema.parse(req.body);
    const map = { theater: db.Theater, hall: db.Hall, show: db.Show };
    const Model = map[body.entity];
    const entity = await Model.findByPk(body.id);
    if (!entity) throw new HttpError(404, 'Not found');
    await entity.update({ isBlocked: body.blocked });
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

const capSchema = z.object({
  seatTypeCode: z.string().min(1).max(40),
  adminPriceCap: z.coerce.number().nonnegative(),
});

async function setSeatTypeCap(req, res, next) {
  try {
    const body = capSchema.parse(req.body);
    const st = await db.SeatType.findOne({ where: { code: body.seatTypeCode } });
    if (!st) throw new HttpError(404, 'Seat type not found');
    await st.update({ adminPriceCap: body.adminPriceCap });
    res.json({ ok: true, seatType: st });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function revenueDashboard(req, res, next) {
  try {
    const bookings = await db.Booking.findAll({ where: { status: db.BOOKING_STATUS.CONFIRMED } });
    const gross = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const adminRevenue = gross * 0.05;

    const shows = await db.Show.findAll({ include: [{ model: db.Hall, include: [{ model: db.Theater }] }] });
    const showToTheater = new Map(shows.map((s) => [String(s.id), String(s.Hall.theaterId)]));

    const totalsByTheater = new Map();
    for (const b of bookings) {
      const theaterId = showToTheater.get(String(b.showId));
      if (!theaterId) continue;
      totalsByTheater.set(theaterId, (totalsByTheater.get(theaterId) ?? 0) + Number(b.totalAmount));
    }

    const theaters = await db.Theater.findAll();
    const nameById = new Map(theaters.map((t) => [String(t.id), t.name]));

    const ranked = Array.from(totalsByTheater.entries())
      .map(([theaterId, total]) => ({ theaterId: Number(theaterId), name: nameById.get(theaterId), total }))
      .sort((a, b) => b.total - a.total);

    const top5 = ranked.slice(0, 5).map((x) => ({
      ...x,
      contributionPct: gross > 0 ? (x.total / gross) * 100 : 0,
    }));

    res.json({ grossRevenue: gross, adminRevenue, top5 });
  } catch (e) {
    next(e);
  }
}

const cancelShowSchema = z.object({ showId: z.coerce.number().int().positive() });
async function cancelShow(req, res, next) {
  try {
    const body = cancelShowSchema.parse(req.body);
    const show = await db.Show.findByPk(body.showId);
    if (!show) throw new HttpError(404, 'Show not found');
    await show.update({ isCancelled: true, cancelledAt: new Date() });
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function listTheatersWithContribution(req, res, next) {
  try {
    const bookings = await db.Booking.findAll({ where: { status: db.BOOKING_STATUS.CONFIRMED } });
    const gross = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const shows = await db.Show.findAll({ include: [{ model: db.Hall, include: [{ model: db.Theater }] }] });
    const showToTheater = new Map(shows.map((s) => [String(s.id), String(s.Hall.theaterId)]));

    const totalsByTheater = new Map();
    for (const b of bookings) {
      const theaterId = showToTheater.get(String(b.showId));
      if (!theaterId) continue;
      totalsByTheater.set(theaterId, (totalsByTheater.get(theaterId) ?? 0) + Number(b.totalAmount));
    }

    const theaters = await db.Theater.findAll();
    const rows = theaters.map((t) => {
      const total = totalsByTheater.get(String(t.id)) ?? 0;
      return { theaterId: t.id, name: t.name, total, contributionPct: gross > 0 ? (total / gross) * 100 : 0 };
    });
    rows.sort((a, b) => b.total - a.total);
    res.json({ grossRevenue: gross, theaters: rows });
  } catch (e) {
    next(e);
  }
}

async function createMovie(req, res, next) {
  try {
    const body = createMovieSchema.parse(req.body);

    const title = body.title.trim();
    const normalizedTitle = title.toLowerCase();

    const existingMovie = await db.Movie.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('title')),
        normalizedTitle
      ),
    });

    if (existingMovie) {
      throw new HttpError(409, 'Movie already exists');
    }

    const movie = await db.Movie.create({
      title,
      genre: body.genre.trim(),
      releaseDate: body.releaseDate,
      description: body.description?.trim() || null,
      durationMins: body.durationMins,
      posterUrl: body.posterUrl?.trim() || null,
      isActive: true,
    });

    res.status(201).json({ movie });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

/* ---------------- NEW FUNCTIONS ---------------- */

// GET SINGLE MOVIE
async function getMovieById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movie = await db.Movie.findByPk(id);
    if (!movie) throw new HttpError(404, 'Movie not found');
    res.json({ movie });
  } catch (e) {
    next(e);
  }
}

// PATCH UPDATE
async function updateMovie(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movie = await db.Movie.findByPk(id);
    if (!movie) throw new HttpError(404, 'Movie not found');

    const body = req.body;
    const updates = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title || !/[a-zA-Z0-9]/.test(title)) {
        throw new HttpError(400, 'Invalid title');
      }
      updates.title = title;
    }

    if (body.genre !== undefined) updates.genre = body.genre.trim();
    if (body.releaseDate !== undefined) updates.releaseDate = body.releaseDate;
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.durationMins !== undefined) updates.durationMins = Number(body.durationMins);

    if (body.posterUrl !== undefined) {
      if (body.posterUrl) {
        try {
          new URL(body.posterUrl);
        } catch {
          throw new HttpError(400, 'Invalid poster URL');
        }
      }
      updates.posterUrl = body.posterUrl?.trim() || null;
    }

    await movie.update(updates);

    res.json({ movie });
  } catch (e) {
    next(e);
  }
}

// DELETE MOVIE
async function deleteMovie(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movie = await db.Movie.findByPk(id);
    if (!movie) throw new HttpError(404, 'Movie not found');

    await movie.destroy();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

/* ---------------- EXPORT ---------------- */

module.exports = {
  pendingApprovals,
  approveHall,
  approveShow,
  setBlocked,
  setSeatTypeCap,
  revenueDashboard,
  cancelShow,
  listTheatersWithContribution,
  createMovie,

  // NEW EXPORTS
  getMovieById,
  updateMovie,
  deleteMovie,
};