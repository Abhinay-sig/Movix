const { z } = require('zod');
const { Op } = require('sequelize');
const multer = require('multer');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');
const { buildPaginationMeta, parsePagination } = require('../utils/pagination');
const {
  serializeMovieWithLanguages,
  replaceMovieLanguages,
} = require('../utils/movieLanguages');
const { uploadImageBuffer } = require('../services/cloudinaryService');

const NAME_REGEX = /^[A-Za-z0-9\s:,'-]+$/;
const posterUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const createMovieSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200)
    .regex(NAME_REGEX, 'Title can contain only alphabets and spaces'),
  genre: z
    .string()
    .trim()
    .min(1, 'Genre is required')
    .max(120)
    .refine((value) => /[a-zA-Z0-9]/.test(value), {
      message: 'Genre cannot be empty or only symbols',
    }),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
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
    .refine((value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, { message: 'Invalid URL format' }),
  languages: z.array(z.string().trim().min(1).max(40)).min(1).optional(),
});

const updateMovieSchema = createMovieSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' }
);

function buildMovieWhere(query) {
  const where = {};
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

  if (String(query.duration ?? '').trim()) {
    const duration = Number(String(query.duration).trim());
    if (Number.isFinite(duration) && duration > 0) {
      and.push(
        db.sequelize.where(db.sequelize.col('duration_mins'), duration)
      );
    }
  }

  if (and.length) where[Op.and] = and;
  return where;
}

async function findMovieIdsByLanguage(language) {
  const normalized = String(language ?? '').trim().toLowerCase();
  if (!normalized) return null;

  const rows = await db.MovieLanguage.findAll({
    attributes: ['movieId'],
    where: db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('language')), {
      [Op.like]: `%${normalized}%`,
    }),
    group: ['movieId'],
    raw: true,
  });

  return rows.map((row) => row.movieId);
}

async function listMovies(req, res, next) {
  try {
    const where = buildMovieWhere(req.query);
    const movieIds = await findMovieIdsByLanguage(req.query.language);
    const { page, limit, offset, hasPagination } = parsePagination(req.query, {
      defaultLimit: 5,
      maxLimit: 20,
    });

    if (movieIds && movieIds.length === 0) {
      res.json({
        movies: [],
        pagination: buildPaginationMeta(0, { page, limit, hasPagination }),
      });
      return;
    }

    if (movieIds && movieIds.length) {
      where.id = { [Op.in]: movieIds };
    }

    const total = await db.Movie.count({ where });
    const options = {
      where,
      include: [{ model: db.MovieLanguage, required: false }],
      order: [['createdAt', 'DESC']],
    };

    if (hasPagination) {
      options.limit = limit;
      options.offset = offset;
    }

    const movies = await db.Movie.findAll(options);

    res.json({
      movies: movies.map(serializeMovieWithLanguages),
      pagination: buildPaginationMeta(total, { page, limit, hasPagination }),
    });
  } catch (e) {
    next(e);
  }
}

async function pendingApprovals(req, res, next) {
  try {
    const theaters = await db.Theater.findAll({
      where: { isBlocked: true },
      include: [{ model: db.User, as: 'owner', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    const halls = await db.Hall.findAll({
      where: { isApproved: false },
      include: [{ model: db.Theater }],
    });
    const shows = await db.Show.findAll({
      where: { isApproved: false },
      include: [{ model: db.Hall, include: [{ model: db.Theater }] }, { model: db.Movie }],
    });
    res.json({ theaters, halls, shows });
  } catch (e) {
    return next(e);
  }
}

const approveTheaterSchema = z.object({
  theaterId: z.coerce.number().int().positive(),
  approve: z.boolean(),
});

async function approveTheater(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = approveTheaterSchema.parse(req.body);
    const theater = await db.Theater.findByPk(body.theaterId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!theater) throw new HttpError(404, 'Theater not found');

    if (body.approve) {
      await theater.update({ isBlocked: false }, { transaction: t });
    } else {
      await theater.destroy({ transaction: t });
    }

    await t.commit();
    res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

const approveHallSchema = z.object({
  hallId: z.coerce.number().int().positive(),
  approve: z.boolean(),
});

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

const approveShowSchema = z.object({
  showId: z.coerce.number().int().positive(),
  approve: z.boolean(),
});

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
    const seatType = await db.SeatType.findOne({ where: { code: body.seatTypeCode } });
    if (!seatType) throw new HttpError(404, 'Seat type not found');
    await seatType.update({ adminPriceCap: body.adminPriceCap });
    res.json({ ok: true, seatType });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function revenueDashboard(req, res, next) {
  try {
    const bookings = await db.Booking.findAll({ where: { status: db.BOOKING_STATUS.CONFIRMED } });
    const gross = bookings.reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
    const adminRevenue = gross * 0.05;

    const shows = await db.Show.findAll({
      include: [{ model: db.Hall, include: [{ model: db.Theater }] }],
    });
    const showToTheater = new Map(shows.map((show) => [String(show.id), String(show.Hall.theaterId)]));

    const totalsByTheater = new Map();
    for (const booking of bookings) {
      const theaterId = showToTheater.get(String(booking.showId));
      if (!theaterId) continue;
      totalsByTheater.set(theaterId, (totalsByTheater.get(theaterId) ?? 0) + Number(booking.totalAmount));
    }

    const theaters = await db.Theater.findAll();
    const nameById = new Map(theaters.map((theater) => [String(theater.id), theater.name]));

    const ranked = Array.from(totalsByTheater.entries())
      .map(([theaterId, total]) => ({
        theaterId: Number(theaterId),
        name: nameById.get(theaterId),
        total,
      }))
      .sort((a, b) => b.total - a.total);

    const top5 = ranked.slice(0, 5).map((row) => ({
      ...row,
      contributionPct: gross > 0 ? (row.total / gross) * 100 : 0,
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
    const gross = bookings.reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
    const shows = await db.Show.findAll({
      include: [{ model: db.Hall, include: [{ model: db.Theater }] }],
    });
    const showToTheater = new Map(shows.map((show) => [String(show.id), String(show.Hall.theaterId)]));

    const totalsByTheater = new Map();
    for (const booking of bookings) {
      const theaterId = showToTheater.get(String(booking.showId));
      if (!theaterId) continue;
      totalsByTheater.set(theaterId, (totalsByTheater.get(theaterId) ?? 0) + Number(booking.totalAmount));
    }

    const theaters = await db.Theater.findAll();
    const rows = theaters
      .map((theater) => {
        const total = totalsByTheater.get(String(theater.id)) ?? 0;
        return {
          theaterId: theater.id,
          name: theater.name,
          total,
          contributionPct: gross > 0 ? (total / gross) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    res.json({ grossRevenue: gross, theaters: rows });
  } catch (e) {
    next(e);
  }
}

async function createMovie(req, res, next) {
  const t = await db.sequelize.transaction();

  try {
    const body = createMovieSchema.parse(req.body);
    const title = body.title.trim();
    const normalizedTitle = title.toLowerCase();

    const existingMovie = await db.Movie.findOne({
      where: db.sequelize.where(
        db.sequelize.fn('LOWER', db.sequelize.col('title')),
        normalizedTitle
      ),
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existingMovie) {
      throw new HttpError(409, 'Movie already exists');
    }

    const movie = await db.Movie.create(
      {
        title,
        genre: body.genre.trim(),
        releaseDate: body.releaseDate,
        description: body.description?.trim() || null,
        durationMins: body.durationMins,
        posterUrl: body.posterUrl?.trim() || null,
        isActive: true,
      },
      { transaction: t }
    );

    await replaceMovieLanguages(db, movie.id, body.languages, t);
    await t.commit();

    const createdMovie = await db.Movie.findByPk(movie.id, {
      include: [{ model: db.MovieLanguage, required: false }],
    });

    res.status(201).json({ movie: serializeMovieWithLanguages(createdMovie) });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function getMovieById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const movie = await db.Movie.findByPk(id, {
      include: [{ model: db.MovieLanguage, required: false }],
    });
    if (!movie) throw new HttpError(404, 'Movie not found');
    res.json({ movie: serializeMovieWithLanguages(movie) });
  } catch (e) {
    next(e);
  }
}

async function updateMovie(req, res, next) {
  const t = await db.sequelize.transaction();

  try {
    const id = Number(req.params.id);
    const movie = await db.Movie.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!movie) throw new HttpError(404, 'Movie not found');

    const body = updateMovieSchema.parse(req.body);
    const updates = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      const conflict = await db.Movie.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.and]: [
            db.sequelize.where(
              db.sequelize.fn('LOWER', db.sequelize.col('title')),
              title.toLowerCase()
            ),
          ],
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (conflict) {
        throw new HttpError(409, 'Movie already exists');
      }

      updates.title = title;
    }

    if (body.genre !== undefined) updates.genre = body.genre.trim();
    if (body.releaseDate !== undefined) updates.releaseDate = body.releaseDate;
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.durationMins !== undefined) updates.durationMins = Number(body.durationMins);

    if (body.posterUrl !== undefined) {
      updates.posterUrl = body.posterUrl?.trim() || null;
    }

    await movie.update(updates, { transaction: t });

    if (body.languages !== undefined) {
      await replaceMovieLanguages(db, movie.id, body.languages, t);
    }

    await t.commit();

    const updatedMovie = await db.Movie.findByPk(id, {
      include: [{ model: db.MovieLanguage, required: false }],
    });

    res.json({ movie: serializeMovieWithLanguages(updatedMovie) });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    next(e);
  }
}

async function deleteMovie(req, res, next) {
  const t = await db.sequelize.transaction();

  try {
    const id = Number(req.params.id);
    const movie = await db.Movie.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!movie) throw new HttpError(404, 'Movie not found');

    await db.MovieLanguage.destroy({ where: { movieId: id }, transaction: t });
    await movie.destroy({ transaction: t });

    await t.commit();
    res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    next(e);
  }
}

async function uploadMoviePoster(req, res, next) {
  try {
    const runUpload = posterUpload.single('poster');

    await new Promise((resolve, reject) => {
      runUpload(req, res, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    if (!req.file) {
      throw new HttpError(400, 'Poster file is required');
    }

    if (!String(req.file.mimetype || '').startsWith('image/')) {
      throw new HttpError(400, 'Only image uploads are allowed');
    }

    const publicId = `movie-${Date.now()}`;
    const upload = await uploadImageBuffer(req.file.buffer, { publicId });

    res.status(201).json({
      posterUrl: upload.secure_url,
    });
  } catch (e) {
    if (e instanceof multer.MulterError) {
      return next(new HttpError(400, e.message));
    }
    return next(e);
  }
}

module.exports = {
  listMovies,
  pendingApprovals,
  approveTheater,
  approveHall,
  approveShow,
  setBlocked,
  setSeatTypeCap,
  revenueDashboard,
  cancelShow,
  listTheatersWithContribution,
  createMovie,
  uploadMoviePoster,
  getMovieById,
  updateMovie,
  deleteMovie,
};
