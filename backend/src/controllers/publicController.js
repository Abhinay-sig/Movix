const { Op } = require('sequelize');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');
const { serializeMovieWithLanguages } = require('../utils/movieLanguages');
const {
  parseSeatCodeForLayout,
  seatTypeForSeat,
  toPublicSeatCode,
} = require('../utils/seatLayout');

function buildShowSummary(show) {
  return {
    showId: show.id,
    movieTitle: show.Movie?.title ?? null,
    theaterName: show.Hall?.Theater?.name ?? null,
    hallName: show.Hall?.name ?? null,
    startsAt: show.startsAt,
    endsAt: show.endsAt,
    language: show.language,
  };
}

async function getSeatTypePricing(showId) {
  const seatTypes = await db.SeatType.findAll({ where: { isActive: true } });
  const showSeatPrices = await db.ShowSeatPrice.findAll({ where: { showId } });

  const seatTypeById = new Map(seatTypes.map((seatType) => [String(seatType.id), seatType]));
  const priceByTypeCode = new Map();

  for (const row of showSeatPrices) {
    const seatType = seatTypeById.get(String(row.seatTypeId));
    if (seatType) {
      priceByTypeCode.set(String(seatType.code).toLowerCase(), Number(row.price));
    }
  }

  const seatTypesWithPricing = seatTypes.map((seatType) => ({
    code: String(seatType.code).toLowerCase(),
    displayName: seatType.displayName,
    price: priceByTypeCode.get(String(seatType.code).toLowerCase()) ?? 0,
  }));

  return { seatTypesWithPricing, priceByTypeCode };
}

async function listMovies(req, res, next) {
  try {
    const search = String(req.query.search ?? '').trim().toLowerCase();
    const languageFilter = String(req.query.language ?? '').trim().toLowerCase();
    const cityFilter = String(req.query.city ?? '').trim().toLowerCase();
    const durationFilter = String(req.query.duration ?? '').trim().toLowerCase();

    const shows = await db.Show.findAll({
      where: { isApproved: true, isBlocked: false, isCancelled: false },
      include: [
        {
          model: db.Movie,
          required: true,
          where: { isActive: true },
          include: [{ model: db.MovieLanguage, required: false }],
        },
        {
          model: db.Hall,
          required: true,
          where: { isApproved: true, isBlocked: false },
          include: [
            {
              model: db.Theater,
              required: true,
              where: { isBlocked: false },
            },
          ],
        },
      ],
      order: [['startsAt', 'ASC']],
    });

    const movieMap = new Map();
    for (const show of shows) {
      const movie = show.Movie;
      const theater = show.Hall?.Theater;
      if (!movie || !theater) continue;

      if (!movieMap.has(String(movie.id))) {
        const baseMovie = serializeMovieWithLanguages(movie);
        movieMap.set(String(movie.id), {
          ...baseMovie,
          languages: [...baseMovie.languages],
          cities: [],
          theaterCount: 0,
          nextShowAt: null,
        });
      }

      const entry = movieMap.get(String(movie.id));
      const lang = show.language?.trim();
      const city = theater.city?.trim();
      if (lang && !entry.languages.includes(lang)) entry.languages.push(lang);
      if (city && !entry.cities.includes(city)) entry.cities.push(city);
      entry.theaterCount = entry.cities.length;
      if (!entry.nextShowAt || new Date(show.startsAt) < new Date(entry.nextShowAt)) {
        entry.nextShowAt = show.startsAt;
      }
    }

    let movies = Array.from(movieMap.values()).map((movie) => ({
      ...movie,
      languages: movie.languages.sort((a, b) => a.localeCompare(b)),
      cities: movie.cities.sort((a, b) => a.localeCompare(b)),
    }));

    if (search) {
      movies = movies.filter((movie) => {
        const haystack = [movie.title, movie.description, ...movie.languages, ...movie.cities]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    if (languageFilter) {
      movies = movies.filter((movie) =>
        movie.languages.some((language) => language.toLowerCase() === languageFilter)
      );
    }

    if (cityFilter) {
      movies = movies.filter((movie) =>
        movie.cities.some((city) => city.toLowerCase() === cityFilter)
      );
    }

    if (durationFilter) {
      movies = movies.filter((movie) => {
        const mins = Number(movie.durationMins) || 0;
        if (durationFilter === 'short') return mins < 120;
        if (durationFilter === 'medium') return mins >= 120 && mins <= 150;
        if (durationFilter === 'long') return mins > 150;
        return true;
      });
    }

    movies.sort((a, b) => a.title.localeCompare(b.title));

    const filters = {
      languages: Array.from(new Set(Array.from(movieMap.values()).flatMap((movie) => movie.languages))).sort((a, b) =>
        a.localeCompare(b)
      ),
      cities: Array.from(new Set(Array.from(movieMap.values()).flatMap((movie) => movie.cities))).sort((a, b) =>
        a.localeCompare(b)
      ),
    };

    res.json({ movies, filters });
  } catch (e) {
    next(e);
  }
}

async function listShowsForMovie(req, res, next) {
  try {
    const movieId = Number(req.params.movieId);
    const shows = await db.Show.findAll({
      where: { movieId, isApproved: true, isBlocked: false, isCancelled: false },
      include: [
        {
          model: db.Movie,
          required: true,
          include: [{ model: db.MovieLanguage, required: false }],
        },
        {
          model: db.Hall,
          where: { isApproved: true, isBlocked: false },
          include: [{ model: db.Theater, where: { isBlocked: false } }],
        },
      ],
      order: [['startsAt', 'ASC']],
    });
    const movie =
      shows[0]?.Movie ||
      (await db.Movie.findByPk(movieId, {
        include: [{ model: db.MovieLanguage, required: false }],
      }));
    if (!movie) throw new HttpError(404, 'Movie not found');

    res.json({ shows, movie: serializeMovieWithLanguages(movie) });
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
      include: [
        { model: db.Hall, include: [{ model: db.Theater }] },
        { model: db.Movie },
      ],
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
    const { seatTypesWithPricing } = await getSeatTypePricing(show.id);

    const now = new Date();
    const held = await db.SeatHold.findAll({
      where: { showId: show.id, status: db.HOLD_STATUS.HELD, expiresAt: { [Op.gt]: now } },
    });
    const booked = await db.BookingSeat.findAll({ where: { showId: show.id } });

    res.json({
      showId: show.id,
      hallId: show.hallId,
      showSummary: buildShowSummary(show),
      seatTypes: seatTypesWithPricing,
      layout: { rows: layout.rows, cols: layout.cols, segmentsByRow: layout.segmentsByRow, typedSegmentsByRow: layout.typedSegmentsByRow },
      heldSeats: held
        .map((h) => parseSeatCodeForLayout(layout, h.seatCode))
        .filter(Boolean)
        .map((seat) => seat.publicSeatCode),
      bookedSeats: booked
        .map((b) => parseSeatCodeForLayout(layout, b.seatCode))
        .filter(Boolean)
        .map((seat) => seat.publicSeatCode),
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
    const fullShow = await db.Show.findByPk(showId, {
      include: [
        { model: db.Hall, include: [{ model: db.Theater }] },
        { model: db.Movie },
      ],
    });
    if (!fullShow) throw new HttpError(404, 'Show not found');

    const { seatTypesWithPricing, priceByTypeCode } = await getSeatTypePricing(showId);

    let total = 0;
    const breakdown = [];
    for (const sc of seatCodes) {
      const parsed = parseSeatCodeForLayout(layout, sc);
      if (!parsed) throw new HttpError(400, `Seat does not exist: ${String(sc).toUpperCase().trim()}`);
      const typeCode = seatTypeForSeat(layout, parsed.rowIdx, parsed.colIdx) ?? db.SEAT_TYPES.STANDARD;
      const normalizedTypeCode = String(typeCode).toLowerCase();
      const price = priceByTypeCode.get(normalizedTypeCode) ?? 0;
      total += price;
      breakdown.push({
        seatCode: toPublicSeatCode(layout, parsed.rowIdx, parsed.colIdx),
        seatTypeCode: normalizedTypeCode,
        seatTypeLabel:
          seatTypesWithPricing.find((seatType) => seatType.code === normalizedTypeCode)?.displayName ??
          'Standard',
        price,
      });
    }

    breakdown.sort((a, b) => a.seatCode.localeCompare(b.seatCode, undefined, { numeric: true }));

    res.json({
      total,
      breakdown,
      seatTypes: seatTypesWithPricing,
      showSummary: buildShowSummary(fullShow),
    });
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
