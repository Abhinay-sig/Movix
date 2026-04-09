const { z } = require('zod');
const { Op } = require('sequelize');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');

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

function countSeatsFromSegments(segmentsByRow) {
  if (!Array.isArray(segmentsByRow)) return 0;
  let total = 0;
  for (const row of segmentsByRow) {
    if (!Array.isArray(row)) continue;
    for (let i = 0; i < row.length; i += 2) {
      const start = Number(row[i]);
      const end = Number(row[i + 1]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
      total += end - start + 1;
    }
  }
  return total;
}

function inferScreenType(name) {
  const s = String(name || '').toLowerCase();
  if (s.includes('imax')) return 'IMAX';
  if (s.includes('3d')) return '3D';
  if (s.includes('2d')) return '2D';
  return null;
}

function computeSeatTypeCounts(layout) {
  const rows = Number(layout?.rows ?? 0);
  const cols = Number(layout?.cols ?? 0);
  const segmentsByRow = layout?.segmentsByRow;
  const typedSegmentsByRow = layout?.typedSegmentsByRow;

  if (!rows || !cols || !Array.isArray(segmentsByRow)) return new Map();

  const counts = new Map();

  for (let r = 0; r < rows; r++) {
    const rowSegs = Array.isArray(segmentsByRow[r]) ? segmentsByRow[r] : [];
    const rowTyped = Array.isArray(typedSegmentsByRow?.[r]) ? typedSegmentsByRow[r] : [];

    for (let i = 0; i < rowSegs.length; i += 2) {
      const start = Number(rowSegs[i]);
      const end = Number(rowSegs[i + 1]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
      for (let c = Math.max(0, start); c <= Math.min(cols - 1, end); c++) {
        let type = db.SEAT_TYPES.STANDARD;
        for (const seg of rowTyped) {
          if (!seg) continue;
          const ts = Number(seg.start);
          const te = Number(seg.end);
          if (!Number.isFinite(ts) || !Number.isFinite(te)) continue;
          if (c >= ts && c <= te) {
            type = seg.type || db.SEAT_TYPES.STANDARD;
            break;
          }
        }
        counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }
  }

  return counts;
}

function getSuggestedCaps({ screenType, totalSeats }) {
  const type = String(screenType || '').toLowerCase();
  const suggestions = new Map([
    [db.SEAT_TYPES.STANDARD, 180],
    [db.SEAT_TYPES.PREMIUM, 320],
    [db.SEAT_TYPES.RECLINER, 550],
    [db.SEAT_TYPES.VIP, 850],
  ]);

  if (type.includes('imax')) {
    suggestions.set(db.SEAT_TYPES.VIP, 800);
    suggestions.set(db.SEAT_TYPES.PREMIUM, 400);
    suggestions.set(db.SEAT_TYPES.STANDARD, 200);
  } else if (type.includes('standard') || type.includes('2d')) {
    suggestions.set(db.SEAT_TYPES.PREMIUM, 300);
    suggestions.set(db.SEAT_TYPES.STANDARD, 150);
  }

  if (Number(totalSeats) > 400) {
    const cur = suggestions.get(db.SEAT_TYPES.STANDARD) ?? 150;
    suggestions.set(db.SEAT_TYPES.STANDARD, Math.max(100, cur - 20));
  }

  return suggestions;
}

function normalizeSeatTypeKey(v) {
  return String(v || '').trim().toLowerCase();
}

function mapSeatTypesByCodeAndName(seatTypes) {
  const byCode = new Map(seatTypes.map((st) => [normalizeSeatTypeKey(st.code), st]));
  const byName = new Map(seatTypes.map((st) => [normalizeSeatTypeKey(st.displayName), st]));
  return { byCode, byName };
}

function relativeTimeFrom(dateValue) {
  if (!dateValue) return 'just now';
  const dt = new Date(dateValue);
  const diffMs = Date.now() - dt.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const reportsQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  theaterId: z.coerce.number().int().positive().optional(),
});

function parseReportQuery(req) {
  const parsed = reportsQuerySchema.parse(req.query ?? {});
  const bookingWhere = { status: db.BOOKING_STATUS.CONFIRMED };

  if (parsed.fromDate) {
    const from = new Date(`${parsed.fromDate}T00:00:00.000Z`);
    bookingWhere.createdAt = { ...(bookingWhere.createdAt || {}), [Op.gte]: from };
  }
  if (parsed.toDate) {
    const to = new Date(`${parsed.toDate}T23:59:59.999Z`);
    bookingWhere.createdAt = { ...(bookingWhere.createdAt || {}), [Op.lte]: to };
  }

  return { bookingWhere, theaterId: parsed.theaterId ?? null };
}

async function pendingHallDetails(req, res, next) {
  try {
    const hallId = Number(req.params.id);
    if (!Number.isInteger(hallId) || hallId <= 0) throw new HttpError(400, 'Invalid hall id');

    const hall = await db.Hall.findOne({
      where: { id: hallId, isApproved: false },
      include: [
        { model: db.Theater },
        { model: db.HallLayout },
        { model: db.HallSeatCap, include: [{ model: db.SeatType }] },
        {
          model: db.Show,
          required: false,
          where: { isApproved: false },
          include: [{ model: db.ShowSeatPrice, include: [{ model: db.SeatType }] }],
        },
      ],
    });
    if (!hall) throw new HttpError(404, 'Pending hall not found');

    const hallJson = hall.toJSON();
    const layout = hallJson.HallLayout || null;
    const totalSeats = layout ? countSeatsFromSegments(layout.segmentsByRow) : 0;
    const countsByType = layout ? computeSeatTypeCounts(layout) : new Map();

    const allSeatTypes = await db.SeatType.findAll({ where: { isActive: true } });
    const capByType = new Map(
      (hallJson.HallSeatCaps || [])
        .filter((x) => x?.SeatType?.code)
        .map((x) => [x.SeatType.code, Number(x.priceCap)])
    );
    const pendingShows = Array.isArray(hallJson.Shows) ? hallJson.Shows : [];
    const latestPendingShow =
      pendingShows
        .slice()
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0] || null;

    const pendingPrices = new Map();
    if (latestPendingShow?.ShowSeatPrices?.length) {
      for (const p of latestPendingShow.ShowSeatPrices) {
        if (!p?.SeatType?.code) continue;
        pendingPrices.set(p.SeatType.code, Number(p.price));
      }
    }

    const seatTypes = allSeatTypes.map((st) => ({
      type: st.code,
      displayName: st.displayName,
      price: pendingPrices.has(st.code) ? pendingPrices.get(st.code) : null,
      adminPriceCap: capByType.has(st.code) ? capByType.get(st.code) : Number(st.adminPriceCap),
      count: countsByType.get(st.code) ?? 0,
    }));

    const facilities = Array.isArray(hallJson.facilities) ? hallJson.facilities : [];
    const images = Array.isArray(hallJson.images) ? hallJson.images : [];

    res.json({
      theaterId: hallJson.Theater?.id ?? null,
      theaterName: hallJson.Theater?.name ?? null,
      location: {
        city: hallJson.Theater?.city ?? null,
        address: hallJson.Theater?.address ?? null,
      },
      hallId: hallJson.id,
      hallName: hallJson.name,
      status: hallJson.isApproved ? 'approved' : 'pending',
      totalSeats,
      screenType: hallJson.screenType ?? inferScreenType(hallJson.name),
      facilities,
      images,
      createdAt: hallJson.createdAt,
      seatLayout: layout
        ? {
            rows: layout.rows,
            cols: layout.cols,
            segmentsByRow: layout.segmentsByRow,
            typedSegmentsByRow: layout.typedSegmentsByRow,
          }
        : null,
      seatTypes,
    });
  } catch (e) {
    next(e);
  }
}

async function pendingShowDetails(req, res, next) {
  try {
    const showId = Number(req.params.id);
    if (!Number.isInteger(showId) || showId <= 0) throw new HttpError(400, 'Invalid show id');

    const show = await db.Show.findOne({
      where: { id: showId, isApproved: false },
      include: [
        { model: db.Movie },
        {
          model: db.Hall,
          include: [{ model: db.Theater }, { model: db.HallLayout }, { model: db.HallSeatCap, include: [{ model: db.SeatType }] }],
        },
        { model: db.ShowSeatPrice, include: [{ model: db.SeatType }] },
      ],
    });
    if (!show) throw new HttpError(404, 'Pending show not found');

    const showJson = show.toJSON();
    const layout = showJson.Hall?.HallLayout || null;
    const totalSeats = layout ? countSeatsFromSegments(layout.segmentsByRow) : 0;

    const now = new Date();
    const [bookedCount, blockedCount] = await Promise.all([
      db.BookingSeat.count({ where: { showId: showJson.id } }),
      db.SeatHold.count({
        where: {
          showId: showJson.id,
          status: db.HOLD_STATUS.HELD,
          expiresAt: { [Op.gt]: now },
        },
      }),
    ]);

    const availableSeats = Math.max(0, totalSeats - bookedCount - blockedCount);
    const hallCapsByType = new Map(
      (showJson.Hall?.HallSeatCaps || [])
        .filter((x) => x?.SeatType?.code)
        .map((x) => [x.SeatType.code, Number(x.priceCap)])
    );
    const pricing = (showJson.ShowSeatPrices || []).map((sp) => ({
      seatTypeCode: sp.SeatType?.code ?? null,
      seatTypeName: sp.SeatType?.displayName ?? sp.SeatType?.code ?? 'Unknown',
      price: Number(sp.price),
      adminPriceCap: sp.SeatType?.code && hallCapsByType.has(sp.SeatType.code) ? hallCapsByType.get(sp.SeatType.code) : null,
    }));

    res.json({
      movie: {
        movieId: showJson.Movie?.id ?? null,
        title: showJson.Movie?.title ?? null,
        duration: showJson.Movie?.durationMins ?? null,
        genre: showJson.Movie?.genre ?? null,
        language: showJson.language ?? null,
        certification: showJson.Movie?.certification ?? null,
        poster: showJson.Movie?.posterUrl ?? null,
      },
      theater: {
        theaterName: showJson.Hall?.Theater?.name ?? null,
        location: {
          city: showJson.Hall?.Theater?.city ?? null,
          address: showJson.Hall?.Theater?.address ?? null,
        },
      },
      hall: {
        hallName: showJson.Hall?.name ?? null,
        screenType: showJson.Hall?.screenType ?? inferScreenType(showJson.Hall?.name),
        totalSeats,
      },
      show: {
        showId: showJson.id,
        showDate: showJson.startsAt,
        showTime: showJson.startsAt,
        endTime: showJson.endsAt,
        format: showJson.Hall?.screenType ?? inferScreenType(showJson.Hall?.name),
      },
      pricing,
      availability: {
        totalSeats,
        availableSeats,
        blockedSeats: blockedCount,
      },
      approvalStatus: 'pending',
    });
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
      throw new HttpError(400, 'Use /api/admin/halls/:id/approve with seat caps');
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

const rejectEntitySchema = z.object({
  reasonType: z.string().trim().min(1).max(80),
  message: z.string().trim().max(1000).optional(),
  suggestion: z.string().trim().max(1000).optional(),
});

async function rejectHall(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const hallId = Number(req.params.id);
    if (!Number.isInteger(hallId) || hallId <= 0) throw new HttpError(400, 'Invalid hall id');
    const body = rejectEntitySchema.parse(req.body);
    const hall = await db.Hall.findOne({ where: { id: hallId, isApproved: false }, transaction: t, lock: t.LOCK.UPDATE });
    if (!hall) throw new HttpError(404, 'Pending hall not found');
    await hall.destroy({ transaction: t });
    await t.commit();
    res.json({ ok: true, entity: 'hall', id: hallId, reasonType: body.reasonType });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

const approvePendingHallWithCapsSchema = z.object({
  seatCaps: z
    .array(
      z.object({
        seatType: z.string().min(1).max(80),
        priceCap: z.coerce.number().positive(),
      })
    )
    .min(1),
});

async function upsertHallCapsWithHistory({
  hallId,
  seatCaps,
  seatTypes,
  changedBy,
  transaction,
}) {
  const { byCode, byName } = mapSeatTypesByCodeAndName(seatTypes);
  const normalized = [];

  for (const sc of seatCaps) {
    const key = normalizeSeatTypeKey(sc.seatType);
    const st = byCode.get(key) || byName.get(key);
    if (!st) throw new HttpError(400, `Unknown seat type: ${sc.seatType}`);
    normalized.push({ seatTypeId: st.id, seatTypeCode: st.code, priceCap: Number(sc.priceCap) });
  }

  const uniqueByType = new Map(normalized.map((x) => [x.seatTypeId, x]));
  if (uniqueByType.size !== seatTypes.length) {
    throw new HttpError(400, 'Provide price cap for all seat types');
  }

  const existing = await db.HallSeatCap.findAll({
    where: { hallId },
    include: [{ model: db.SeatType }],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const existingByType = new Map(existing.map((row) => [row.seatTypeId, row]));

  for (const row of uniqueByType.values()) {
    const prev = existingByType.get(row.seatTypeId);
    const oldCap = prev ? Number(prev.priceCap) : null;
    const newCap = Number(row.priceCap);
    const changed = oldCap === null || Number(oldCap) !== Number(newCap);

    if (prev) {
      // eslint-disable-next-line no-await-in-loop
      await prev.update({ priceCap: newCap }, { transaction });
    } else {
      // eslint-disable-next-line no-await-in-loop
      await db.HallSeatCap.create(
        { hallId, seatTypeId: row.seatTypeId, priceCap: newCap },
        { transaction }
      );
    }

    if (changed) {
      // eslint-disable-next-line no-await-in-loop
      await db.SeatCapHistory.create(
        {
          hallId,
          seatType: row.seatTypeCode,
          oldCap,
          newCap,
          changedBy,
        },
        { transaction }
      );
    }
  }
}

async function approvePendingHallWithCaps(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const hallId = Number(req.params.id);
    if (!Number.isInteger(hallId) || hallId <= 0) throw new HttpError(400, 'Invalid hall id');

    const body = approvePendingHallWithCapsSchema.parse(req.body);
    const hall = await db.Hall.findByPk(hallId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!hall || hall.isApproved) throw new HttpError(404, 'Pending hall not found');

    const seatTypes = await db.SeatType.findAll({ where: { isActive: true }, transaction: t, lock: t.LOCK.UPDATE });
    await upsertHallCapsWithHistory({
      hallId,
      seatCaps: body.seatCaps,
      seatTypes,
      changedBy: `${req.user.id}:${req.user.name || req.user.email || 'admin'}`,
      transaction: t,
    });

    await hall.update({ isApproved: true, approvedAt: new Date() }, { transaction: t });
    await t.commit();
    res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

const updateHallCapsSchema = z.object({
  seatCaps: z
    .array(
      z.object({
        seatType: z.string().min(1).max(80),
        priceCap: z.coerce.number().positive(),
      })
    )
    .min(1),
});

async function listApprovedHalls(req, res, next) {
  try {
    const halls = await db.Hall.findAll({
      where: { isApproved: true },
      include: [{ model: db.Theater }],
      order: [['updatedAt', 'DESC']],
    });
    res.json({ halls });
  } catch (e) {
    next(e);
  }
}

const listHallsSchema = z.object({
  theaterId: z.coerce.number().int().positive().optional(),
});

async function listHalls(req, res, next) {
  try {
    const parsed = listHallsSchema.safeParse(req.query ?? {});
    if (!parsed.success) throw new HttpError(400, 'Invalid query');

    const where = {};
    if (parsed.data.theaterId) where.theaterId = parsed.data.theaterId;

    const halls = await db.Hall.findAll({
      where,
      include: [{ model: db.Theater }],
      order: [['updatedAt', 'DESC']],
    });
    res.json({ halls });
  } catch (e) {
    next(e);
  }
}

async function hallCapsDetails(req, res, next) {
  try {
    const hallId = Number(req.params.id);
    if (!Number.isInteger(hallId) || hallId <= 0) throw new HttpError(400, 'Invalid hall id');

    const hall = await db.Hall.findByPk(hallId, {
      include: [{ model: db.Theater }, { model: db.HallLayout }, { model: db.HallSeatCap, include: [{ model: db.SeatType }] }],
    });
    if (!hall) throw new HttpError(404, 'Hall not found');

    const hallJson = hall.toJSON();
    const totalSeats = hallJson.HallLayout ? countSeatsFromSegments(hallJson.HallLayout.segmentsByRow) : 0;
    const countsByType = hallJson.HallLayout ? computeSeatTypeCounts(hallJson.HallLayout) : new Map();
    const capByType = new Map(
      (hallJson.HallSeatCaps || [])
        .filter((x) => x?.SeatType?.code)
        .map((x) => [x.SeatType.code, Number(x.priceCap)])
    );

    const allSeatTypes = await db.SeatType.findAll({ where: { isActive: true } });
    const seatTypes = allSeatTypes.map((st) => ({
      type: st.code,
      displayName: st.displayName,
      adminPriceCap: capByType.has(st.code) ? capByType.get(st.code) : Number(st.adminPriceCap),
      count: countsByType.get(st.code) ?? 0,
    }));

    res.json({
      hallId: hallJson.id,
      hallName: hallJson.name,
      screenType: hallJson.screenType ?? inferScreenType(hallJson.name),
      theaterName: hallJson.Theater?.name ?? null,
      totalSeats,
      seatTypes,
    });
  } catch (e) {
    next(e);
  }
}

async function updateHallCaps(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const hallId = Number(req.params.id);
    if (!Number.isInteger(hallId) || hallId <= 0) throw new HttpError(400, 'Invalid hall id');
    const body = updateHallCapsSchema.parse(req.body);

    const hall = await db.Hall.findByPk(hallId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!hall) throw new HttpError(404, 'Hall not found');

    const seatTypes = await db.SeatType.findAll({ where: { isActive: true }, transaction: t, lock: t.LOCK.UPDATE });
    await upsertHallCapsWithHistory({
      hallId,
      seatCaps: body.seatCaps,
      seatTypes,
      changedBy: `${req.user.id}:${req.user.name || req.user.email || 'admin'}`,
      transaction: t,
    });

    await t.commit();
    res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function hallCapHistory(req, res, next) {
  try {
    const hallId = Number(req.params.id);
    if (!Number.isInteger(hallId) || hallId <= 0) throw new HttpError(400, 'Invalid hall id');
    const hall = await db.Hall.findByPk(hallId, { include: [{ model: db.Theater }] });
    if (!hall) throw new HttpError(404, 'Hall not found');

    const history = await db.SeatCapHistory.findAll({
      where: { hallId },
      order: [['createdAt', 'DESC']],
    });
    res.json({
      hall: {
        hallId: hall.id,
        hallName: hall.name,
        theaterName: hall.Theater?.name ?? null,
      },
      history,
    });
  } catch (e) {
    next(e);
  }
}

async function suggestedCapsForHall(req, res, next) {
  try {
    const hallId = Number(req.params.id);
    if (!Number.isInteger(hallId) || hallId <= 0) throw new HttpError(400, 'Invalid hall id');
    const hall = await db.Hall.findByPk(hallId, { include: [{ model: db.HallLayout }] });
    if (!hall) throw new HttpError(404, 'Hall not found');

    const hallJson = hall.toJSON();
    const totalSeats = hallJson.HallLayout ? countSeatsFromSegments(hallJson.HallLayout.segmentsByRow) : 0;
    const screenType = hallJson.screenType ?? inferScreenType(hallJson.name) ?? 'Standard';
    const suggestions = getSuggestedCaps({ screenType, totalSeats });

    const seatTypes = await db.SeatType.findAll({ where: { isActive: true } });
    const seatCaps = seatTypes.map((st) => ({
      seatType: st.code,
      displayName: st.displayName,
      suggestedCap: suggestions.get(st.code) ?? Number(st.adminPriceCap),
    }));

    res.json({
      hallId: hallJson.id,
      hallName: hallJson.name,
      screenType,
      totalSeats,
      seatCaps,
    });
  } catch (e) {
    next(e);
  }
}

const approveShowSchema = z
  .object({
    showId: z.coerce.number().int().positive(),
    approve: z.boolean(),
    rejectReason: z.string().trim().min(1).max(120).optional(),
    rejectComment: z.string().trim().max(1000).optional(),
    suggestedCaps: z.record(z.string(), z.coerce.number().positive()).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.approve && !val.rejectReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rejection reason is required',
        path: ['rejectReason'],
      });
    }
    if (!val.approve && String(val.rejectReason || '').toLowerCase() === 'other' && !val.rejectComment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom rejection comment is required for "Other"',
        path: ['rejectComment'],
      });
    }
    if (!val.approve && String(val.rejectReason || '').toLowerCase() === 'pricing_issue' && (!val.suggestedCaps || Object.keys(val.suggestedCaps).length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Suggested caps are required for pricing issue rejection',
        path: ['suggestedCaps'],
      });
    }
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

async function rejectShow(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const showId = Number(req.params.id);
    if (!Number.isInteger(showId) || showId <= 0) throw new HttpError(400, 'Invalid show id');
    const body = rejectEntitySchema.parse(req.body);
    const show = await db.Show.findOne({ where: { id: showId, isApproved: false }, transaction: t, lock: t.LOCK.UPDATE });
    if (!show) throw new HttpError(404, 'Pending show not found');
    await show.destroy({ transaction: t });
    await t.commit();
    res.json({ ok: true, entity: 'show', id: showId, reasonType: body.reasonType });
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
    //await st.update({ adminPriceCap: body.adminPriceCap });
    await db.ShowSeatPrice.update(
      { capPrice: body.adminPriceCap },
      {
        where: {
          showId: body.showId,
          seatTypeId: st.id
        }
      }
    );
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

    // Top 5 theaters by gross
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

async function revenueTrend(req, res, next) {
  try {
    const rows = await db.Booking.findAll({
      where: {
        status: db.BOOKING_STATUS.CONFIRMED,
      },
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
        [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'revenue'],
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
      order: [[db.sequelize.literal('date'), 'ASC']],
      raw: true,
    });

    const trend = rows.map((r) => ({
      date: String(r.date),
      revenue: Number(r.revenue || 0),
    }));
    res.json(trend);
  } catch (e) {
    next(e);
  }
}

async function dashboardStats(req, res, next) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    const now = new Date();

    const [totalBookings, todayTickets, activeShows] = await Promise.all([
      db.Booking.count({ where: { status: db.BOOKING_STATUS.CONFIRMED } }),
      db.BookingSeat.count({
        include: [
          {
            model: db.Booking,
            where: {
              status: db.BOOKING_STATUS.CONFIRMED,
              createdAt: { [Op.gte]: todayStart, [Op.lt]: tomorrowStart },
            },
          },
        ],
      }),
      db.Show.count({
        where: {
          isApproved: true,
          isCancelled: false,
          isBlocked: false,
          startsAt: { [Op.lte]: now },
          endsAt: { [Op.gte]: now },
        },
      }),
    ]);

    res.json({ totalBookings, todayTickets, activeShows });
  } catch (e) {
    next(e);
  }
}

async function activityFeed(req, res, next) {
  try {
    const [hallApprovals, showApprovals, capChanges, showCancellations] = await Promise.all([
      db.Hall.findAll({
        where: { approvedAt: { [Op.ne]: null } },
        attributes: ['id', 'name', 'approvedAt'],
        order: [['approvedAt', 'DESC']],
        limit: 10,
      }),
      db.Show.findAll({
        where: { approvedAt: { [Op.ne]: null } },
        attributes: ['id', 'approvedAt'],
        include: [{ model: db.Movie, attributes: ['title'] }],
        order: [['approvedAt', 'DESC']],
        limit: 10,
      }),
      db.SeatCapHistory.findAll({
        attributes: ['id', 'hallId', 'seatType', 'newCap', 'changedBy', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
      db.Show.findAll({
        where: { cancelledAt: { [Op.ne]: null } },
        attributes: ['id', 'cancelledAt'],
        include: [{ model: db.Movie, attributes: ['title'] }],
        order: [['cancelledAt', 'DESC']],
        limit: 10,
      }),
    ]);

    const events = [];
    for (const h of hallApprovals) {
      events.push({
        message: `Hall ${h.name || `#${h.id}`} approved`,
        time: relativeTimeFrom(h.approvedAt),
        ts: new Date(h.approvedAt).getTime(),
      });
    }
    for (const s of showApprovals) {
      events.push({
        message: `Show #${s.id}${s.Movie?.title ? ` (${s.Movie.title})` : ''} approved`,
        time: relativeTimeFrom(s.approvedAt),
        ts: new Date(s.approvedAt).getTime(),
      });
    }
    for (const c of capChanges) {
      events.push({
        message: `Seat cap updated for hall #${c.hallId} (${c.seatType}: ₹${c.newCap})`,
        time: relativeTimeFrom(c.createdAt),
        ts: new Date(c.createdAt).getTime(),
      });
    }
    for (const s of showCancellations) {
      events.push({
        message: `Show #${s.id}${s.Movie?.title ? ` (${s.Movie.title})` : ''} cancelled`,
        time: relativeTimeFrom(s.cancelledAt),
        ts: new Date(s.cancelledAt).getTime(),
      });
    }

    events.sort((a, b) => b.ts - a.ts);
    res.json(events.slice(0, 10).map(({ message, time }) => ({ message, time })));
  } catch (e) {
    next(e);
  }
}

async function revenueReport(req, res, next) {
  try {
    const { bookingWhere, theaterId } = parseReportQuery(req);
    const bookings = await db.Booking.findAll({
      where: bookingWhere,
      include: [
        {
          model: db.Show,
          include: [
            {
              model: db.Hall,
              include: [
                {
                  model: db.Theater,
                  ...(theaterId ? { where: { id: theaterId } } : {}),
                },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const grouped = new Map();
    for (const b of bookings) {
      const date = new Date(b.createdAt).toISOString().slice(0, 10);
      const theater = b.Show?.Hall?.Theater?.name || 'Unknown';
      const key = `${date}__${theater}`;
      grouped.set(key, (grouped.get(key) ?? 0) + Number(b.totalAmount));
    }

    const rows = Array.from(grouped.entries())
      .map(([key, revenue]) => {
        const [date, theater] = key.split('__');
        return { date, theater, revenue: Number(revenue.toFixed(2)) };
      })
      .sort((a, b) => `${a.date}${a.theater}`.localeCompare(`${b.date}${b.theater}`));

    res.json(rows);
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid query', e.flatten()));
    return next(e);
  }
}

async function bookingReport(req, res, next) {
  try {
    const { bookingWhere, theaterId } = parseReportQuery(req);
    const bookings = await db.Booking.findAll({
      where: bookingWhere,
      include: [
        { model: db.User, attributes: ['name'] },
        { model: db.BookingSeat, attributes: ['seatCode'] },
        {
          model: db.Show,
          include: [
            { model: db.Movie, attributes: ['title'] },
            {
              model: db.Hall,
              include: [{ model: db.Theater, ...(theaterId ? { where: { id: theaterId } } : {}) }],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const rows = bookings.map((b) => ({
      user: b.User?.name || 'Unknown',
      movie: b.Show?.Movie?.title || 'Unknown',
      seats: (b.BookingSeats || []).map((s) => s.seatCode),
      amount: Number(b.totalAmount),
      date: new Date(b.createdAt).toISOString().slice(0, 10),
      theater: b.Show?.Hall?.Theater?.name || 'Unknown',
    }));

    res.json(rows);
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid query', e.flatten()));
    return next(e);
  }
}

async function theaterPerformanceReport(req, res, next) {
  try {
    const { bookingWhere, theaterId } = parseReportQuery(req);
    const bookings = await db.Booking.findAll({
      where: bookingWhere,
      include: [
        {
          model: db.Show,
          include: [{ model: db.Hall, include: [{ model: db.Theater, ...(theaterId ? { where: { id: theaterId } } : {}) }] }],
        },
      ],
    });

    const byTheater = new Map();
    for (const b of bookings) {
      const theater = b.Show?.Hall?.Theater;
      if (!theater) continue;
      const key = String(theater.id);
      const prev = byTheater.get(key) || { theater: theater.name, totalRevenue: 0, totalBookings: 0 };
      prev.totalRevenue += Number(b.totalAmount);
      prev.totalBookings += 1;
      byTheater.set(key, prev);
    }

    const rows = Array.from(byTheater.values())
      .map((r) => ({ ...r, totalRevenue: Number(r.totalRevenue.toFixed(2)) }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json(rows);
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid query', e.flatten()));
    return next(e);
  }
}

async function seatTypeRevenueReport(req, res, next) {
  try {
    const { bookingWhere, theaterId } = parseReportQuery(req);
    const rows = await db.BookingSeat.findAll({
      include: [
        { model: db.SeatType, attributes: ['code', 'displayName'] },
        { model: db.Booking, where: bookingWhere, attributes: [] },
        {
          model: db.Show,
          include: [{ model: db.Hall, include: [{ model: db.Theater, ...(theaterId ? { where: { id: theaterId } } : {}) }] }],
          attributes: [],
        },
      ],
      attributes: ['price'],
    });

    const byType = new Map();
    for (const r of rows) {
      const key = r.SeatType?.displayName || r.SeatType?.code || 'Unknown';
      byType.set(key, (byType.get(key) ?? 0) + Number(r.price));
    }

    const result = Array.from(byType.entries())
      .map(([seatType, revenue]) => ({ seatType, revenue: Number(revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query', details: err.flatten() });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to load seat type report' });
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

module.exports = {
  pendingApprovals,
  pendingHallDetails,
  pendingShowDetails,
  listHalls,
  listApprovedHalls,
  hallCapsDetails,
  updateHallCaps,
  hallCapHistory,
  suggestedCapsForHall,
  approvePendingHallWithCaps,
  approveHall,
  approveShow,
  rejectHall,
  rejectShow,
  setBlocked,
  setSeatTypeCap,
  revenueTrend,
  dashboardStats,
  activityFeed,
  revenueReport,
  bookingReport,
  theaterPerformanceReport,
  seatTypeRevenueReport,
  revenueDashboard,
  cancelShow,
  listTheatersWithContribution,
};
