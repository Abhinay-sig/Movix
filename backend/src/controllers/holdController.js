// const { z } = require('zod');
// const { Op } = require('sequelize');
// const dayjs = require('dayjs');
// const { env } = require('../config/env');
// const { db } = require('../models');
// const { HttpError } = require('../utils/httpError');
// const { parseSeatCode, layoutHasSeat, seatTypeForSeat } = require('../utils/seatLayout');

// const createHoldSchema = z.object({
//   showId: z.coerce.number().int().positive(),
//   seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
// });

// async function cleanupExpiredHolds() {
//   const now = new Date();
//   await db.SeatHold.update(
//     { status: db.HOLD_STATUS.RELEASED },
//     {
//       where: {
//         status: db.HOLD_STATUS.HELD,
//         expiresAt: { [Op.lte]: now },
//       },
//     }
//   );
// }

// async function createHold(req, res, next) {
//   const t = await db.sequelize.transaction();
//   try {
//     const body = createHoldSchema.parse(req.body);
//     const show = await db.Show.findByPk(body.showId, { transaction: t, lock: t.LOCK.UPDATE });
//     if (!show || show.isCancelled || show.isBlocked || !show.isApproved) {
//       throw new HttpError(404, 'Show not available');
//     }

//     await cleanupExpiredHolds();

//     const seatCodes = Array.from(new Set(body.seatCodes.map((s) => s.toUpperCase().trim())));
//     if (seatCodes.length < 1) throw new HttpError(400, 'Select at least 1 seat');
//     if (seatCodes.length > 10) throw new HttpError(400, 'Select at most 10 seats');

//     const hall = await db.Hall.findByPk(show.hallId, { transaction: t });
//     const layout = await db.HallLayout.findOne({ where: { hallId: hall.id }, transaction: t });
//     if (!layout) throw new HttpError(409, 'Seat layout not configured');

//     for (const seatCode of seatCodes) {
//       const parsed = parseSeatCode(seatCode);
//       if (!parsed) throw new HttpError(400, `Invalid seat code: ${seatCode}`);
//       if (!layoutHasSeat(layout, parsed.rowIdx, parsed.colIdx)) {
//         throw new HttpError(400, `Seat does not exist in layout: ${seatCode}`);
//       }
//     }

//     // 1) Reject if already booked (hard constraint).
//     const alreadyBooked = await db.BookingSeat.findAll({
//       where: { showId: show.id, seatCode: { [Op.in]: seatCodes } },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });
//     if (alreadyBooked.length) throw new HttpError(409, 'Some seats are already booked');

//     // 2) Lock existing hold rows (if any) for these seats.
//     const existingHolds = await db.SeatHold.findAll({
//       where: { showId: show.id, seatCode: { [Op.in]: seatCodes } },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     const now = dayjs();
//     const expiresAt = now.add(env.seatHoldMs, 'millisecond').toDate();

//     const existingBySeat = new Map(existingHolds.map((h) => [h.seatCode, h]));
//     for (const seatCode of seatCodes) {
//       const hold = existingBySeat.get(seatCode);
//       if (!hold) continue;

//       const isExpired = dayjs(hold.expiresAt).isBefore(now);
//       const isActiveHeld = hold.status === db.HOLD_STATUS.HELD && !isExpired;
//       const heldByOther = isActiveHeld && String(hold.userId) !== String(req.user.id);

//       if (heldByOther) {
//         throw new HttpError(409, 'Some seats are temporarily locked by another user');
//       }
//     }

//     // 3) Upsert holds: create missing; refresh ours; reclaim expired/released.
//     for (const seatCode of seatCodes) {
//       const hold = existingBySeat.get(seatCode);
//       if (!hold) {
//         // eslint-disable-next-line no-await-in-loop
//         await db.SeatHold.create(
//           {
//             showId: show.id,
//             seatCode,
//             userId: req.user.id,
//             status: db.HOLD_STATUS.HELD,
//             expiresAt,
//           },
//           { transaction: t }
//         );
//       } else {
//         // eslint-disable-next-line no-await-in-loop
//         await hold.update(
//           { userId: req.user.id, status: db.HOLD_STATUS.HELD, expiresAt },
//           { transaction: t }
//         );
//       }
//     }

//     await t.commit();

//     res.status(201).json({
//       showId: show.id,
//       seatCodes,
//       expiresAt,
//       holdMs: env.seatHoldMs,
//     });
//   } catch (e) {
//     await t.rollback();
//     if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
//     return next(e);
//   }
// }

// const confirmSchema = z.object({
//   showId: z.coerce.number().int().positive(),
//   seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
// });

// async function confirmBooking(req, res, next) {
//   const t = await db.sequelize.transaction();
//   try {
//     const body = confirmSchema.parse(req.body);
//     const seatCodes = Array.from(new Set(body.seatCodes.map((s) => s.toUpperCase().trim())));

//     const show = await db.Show.findByPk(body.showId, { transaction: t, lock: t.LOCK.UPDATE });
//     if (!show || show.isCancelled || show.isBlocked || !show.isApproved) {
//       throw new HttpError(404, 'Show not available');
//     }

//     const hall = await db.Hall.findByPk(show.hallId, { transaction: t });
//     const layout = await db.HallLayout.findOne({ where: { hallId: hall.id }, transaction: t });
//     if (!layout) throw new HttpError(409, 'Seat layout not configured');

//     for (const seatCode of seatCodes) {
//       const parsed = parseSeatCode(seatCode);
//       if (!parsed) throw new HttpError(400, `Invalid seat code: ${seatCode}`);
//       if (!layoutHasSeat(layout, parsed.rowIdx, parsed.colIdx)) {
//         throw new HttpError(400, `Seat does not exist in layout: ${seatCode}`);
//       }
//     }

//     const now = new Date();

//     // Lock holds rows for these seats
//     const holds = await db.SeatHold.findAll({
//       where: { showId: show.id, seatCode: { [Op.in]: seatCodes } },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (holds.length !== seatCodes.length) {
//       throw new HttpError(409, 'Seat hold expired');
//     }

//     for (const h of holds) {
//       if (h.status !== db.HOLD_STATUS.HELD) throw new HttpError(409, 'Seat hold expired');
//       if (String(h.userId) !== String(req.user.id)) throw new HttpError(409, 'Seat hold expired');
//       if (h.expiresAt <= now) throw new HttpError(409, 'Seat hold expired');
//     }

//     // Hard constraint check again
//     const alreadyBooked = await db.BookingSeat.findAll({
//       where: { showId: show.id, seatCode: { [Op.in]: seatCodes } },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });
//     if (alreadyBooked.length) throw new HttpError(409, 'Some seats are already booked');

//     // Pricing: infer seat type from layout and show seat prices
//     const showPrices = await db.ShowSeatPrice.findAll({
//       where: { showId: show.id },
//       include: [{ model: db.SeatType }],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });
//     const priceByTypeCode = new Map(showPrices.map((p) => [p.SeatType.code, Number(p.price)]));

//     let totalAmount = 0;
//     const seatMeta = [];
//     for (const seatCode of seatCodes) {
//       const parsed = parseSeatCode(seatCode);
//       const typeCode = seatTypeForSeat(layout, parsed.rowIdx, parsed.colIdx) ?? db.SEAT_TYPES.STANDARD;
//       const price = priceByTypeCode.get(typeCode) ?? 0;
//       totalAmount += price;
//       seatMeta.push({ seatCode, typeCode, price });
//     }

//     const booking = await db.Booking.create(
//       {
//         showId: show.id,
//         userId: req.user.id,
//         status: db.BOOKING_STATUS.CONFIRMED,
//         totalAmount,
//       },
//       { transaction: t }
//     );

//     for (const { seatCode, typeCode, price } of seatMeta) {
//       const st = showPrices.find((p) => p.SeatType.code === typeCode)?.SeatType ?? null;
//       // eslint-disable-next-line no-await-in-loop
//       await db.BookingSeat.create(
//         { bookingId: booking.id, showId: show.id, seatCode, seatTypeId: st ? st.id : null, price },
//         { transaction: t }
//       );
//     }

//     // Release holds
//     await db.SeatHold.update(
//       { status: db.HOLD_STATUS.RELEASED },
//       { where: { showId: show.id, seatCode: { [Op.in]: seatCodes } }, transaction: t }
//     );

//     await t.commit();
//     res.status(201).json({ bookingId: booking.id, showId: show.id, seatCodes, totalAmount });
//   } catch (e) {
//     await t.rollback();
//     if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
//     return next(e);
//   }
// }

// module.exports = { createHold, confirmBooking, cleanupExpiredHolds };

const crypto = require('crypto');
const { z } = require('zod');
const { Op, UniqueConstraintError } = require('sequelize');
const { env } = require('../config/env');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');
const { sendOtpEmail } = require('../utils/emailService');
const {
  parseSeatCodeForLayout,
  seatTypeForSeat,
  toPublicSeatCode,
} = require('../utils/seatLayout');

const HOLD_STATUS = db.HOLD_STATUS || {
  HELD: 'held',
  RELEASED: 'released',
};

const BOOKING_STATUS = db.BOOKING_STATUS || {
  CONFIRMED: 'confirmed',
};

const DEFAULT_SEAT_TYPE = db.SEAT_TYPES?.STANDARD || 'standard';

const createHoldSchema = z.object({
  showId: z.coerce.number().int().positive(),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
  sessionToken: z.string().min(8).max(96),
});

const confirmSchema = z.object({
  showId: z.coerce.number().int().positive(),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
  email: z.string().email().max(320),
  sessionToken: z.string().min(8).max(96),
});

const sendOtpSchema = z.object({
  showId: z.coerce.number().int().positive(),
  email: z.string().email().max(320),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
  sessionToken: z.string().min(8).max(96),
});

const verifyOtpSchema = z.object({
  showId: z.coerce.number().int().positive(),
  email: z.string().email().max(320),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
  otp: z.string().length(6),
  sessionToken: z.string().min(8).max(96),
});

const releaseHoldSchema = z.object({
  showId: z.coerce.number().int().positive(),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
  sessionToken: z.string().min(8).max(96),
});

const otpStore = new Map();

function isShowBookingOpen(show) {
  const startsAtMs = new Date(show?.startsAt).getTime();
  return Number.isFinite(startsAtMs) && startsAtMs > Date.now();
}

function buildBookingTicket({ booking, seatMeta, show }) {
  return {
    bookingId: booking.id,
    status: booking.status,
    totalAmount: Number(booking.totalAmount),
    seats: seatMeta.map((seat) => ({
      seatCode: seat.publicSeatCode,
      seatTypeCode: seat.typeCode,
      price: Number(seat.price),
    })),
    show: {
      showId: show.id,
      movieTitle: show.Movie?.title ?? null,
      theaterName: show.Hall?.Theater?.name ?? null,
      hallName: show.Hall?.name ?? null,
      startsAt: show.startsAt,
      endsAt: show.endsAt,
      language: show.language,
    },
    bookedAt: booking.createdAt,
  };
}

function otpKey({ userId, showId, email }) {
  return `${userId}:${showId}:${String(email).trim().toLowerCase()}`;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function isUniqueConstraintError(err) {
  return (
    err instanceof UniqueConstraintError ||
    err?.name === 'SequelizeUniqueConstraintError' ||
    err?.parent?.code === '23505' || // postgres
    err?.parent?.code === 'ER_DUP_ENTRY' || // mysql/mariadb
    err?.original?.code === '23505' ||
    err?.original?.code === 'ER_DUP_ENTRY'
  );
}

async function cleanupExpiredHolds(transaction = null) {
  const now = new Date();
  await db.SeatHold.update(
    { status: HOLD_STATUS.RELEASED },
    {
      where: {
        status: HOLD_STATUS.HELD,
        expiresAt: { [Op.lte]: now },
      },
      ...(transaction ? { transaction } : {}),
    }
  );
}

async function claimSeatHold({ t, showId, seatCode, userId, sessionToken, expiresAt }) {
  const nowMs = Date.now();

  const existing = await db.SeatHold.findOne({
    where: { showId, seatCode },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (existing) {
    const expiresAtMs = new Date(existing.expiresAt).getTime();
    const isExpired = Number.isFinite(expiresAtMs) ? expiresAtMs <= nowMs : true;
    const isActiveHeld = existing.status === HOLD_STATUS.HELD && !isExpired;
    const heldByOther =
      isActiveHeld &&
      String(existing.userId) !== String(userId) &&
      String(existing.sessionToken || '') !== String(sessionToken);

    if (heldByOther) {
      throw new HttpError(409, 'Some seats are temporarily locked by another user');
    }

    await existing.update(
      {
        userId,
        sessionToken,
        status: HOLD_STATUS.HELD,
        expiresAt,
      },
      { transaction: t }
    );
    return;
  }

  try {
    await db.SeatHold.create(
      {
        showId,
        seatCode,
        userId,
        sessionToken,
        status: HOLD_STATUS.HELD,
        expiresAt,
      },
      { transaction: t }
    );
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err;

    const row = await db.SeatHold.findOne({
      where: { showId, seatCode },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!row) throw err;

    const expiresAtMs = new Date(row.expiresAt).getTime();
    const isExpired = Number.isFinite(expiresAtMs) ? expiresAtMs <= nowMs : true;
    const isActiveHeld = row.status === HOLD_STATUS.HELD && !isExpired;
    const heldByOther =
      isActiveHeld &&
      String(row.userId) !== String(userId) &&
      String(row.sessionToken || '') !== String(sessionToken);

    if (heldByOther) {
      throw new HttpError(409, 'Some seats are temporarily locked by another user');
    }

    await row.update(
      {
        userId,
        sessionToken,
        status: HOLD_STATUS.HELD,
        expiresAt,
      },
      { transaction: t }
    );
  }
}

async function refreshSeatHoldsForCheckout({ t, showId, seatCodes, userId, sessionToken }) {
  const requestedSeatCodes = Array.from(
    new Set(seatCodes.map((seatCode) => String(seatCode).toUpperCase().trim()))
  );

  if (requestedSeatCodes.length < 1) throw new HttpError(400, 'Select at least 1 seat');
  if (requestedSeatCodes.length > 10) throw new HttpError(400, 'Select at most 10 seats');

  const show = await db.Show.findByPk(showId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!show || show.isCancelled || show.isBlocked || !show.isApproved) {
    throw new HttpError(404, 'Show not available');
  }
  if (!isShowBookingOpen(show)) throw new HttpError(409, 'Show booking closed');

  await cleanupExpiredHolds(t);

  const hall = await db.Hall.findByPk(show.hallId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!hall) throw new HttpError(404, 'Hall not found');

  const layout = await db.HallLayout.findOne({
    where: { hallId: hall.id },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!layout) throw new HttpError(409, 'Seat layout not configured');

  const parsedSeats = requestedSeatCodes.map((seatCode) => {
    const parsed = parseSeatCodeForLayout(layout, seatCode);
    if (!parsed) throw new HttpError(400, `Seat does not exist in layout: ${seatCode}`);
    return parsed;
  });

  const absoluteSeatCodes = parsedSeats.map((seat) => seat.absoluteSeatCode);
  const alreadyBooked = await db.BookingSeat.findAll({
    where: { showId: show.id, seatCode: { [Op.in]: absoluteSeatCodes } },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (alreadyBooked.length) throw new HttpError(409, 'Some seats are already booked');

  const holdDurationMs = Number(env.seatHoldMs ?? 120000);
  const expiresAt = new Date(Date.now() + holdDurationMs);

  for (const seatCode of absoluteSeatCodes) {
    // eslint-disable-next-line no-await-in-loop
    await claimSeatHold({
      t,
      showId: show.id,
      seatCode,
      userId,
      sessionToken,
      expiresAt,
    });
  }

  return {
    expiresAt,
    holdMs: holdDurationMs,
  };
}

async function releaseSeatHolds({ t, showId, seatCodes, userId, sessionToken }) {
  const requestedSeatCodes = Array.from(
    new Set(seatCodes.map((seatCode) => String(seatCode).toUpperCase().trim()))
  );

  if (requestedSeatCodes.length < 1) throw new HttpError(400, 'Select at least 1 seat');
  if (requestedSeatCodes.length > 10) throw new HttpError(400, 'Select at most 10 seats');

  const show = await db.Show.findByPk(showId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!show) throw new HttpError(404, 'Show not available');

  const hall = await db.Hall.findByPk(show.hallId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!hall) throw new HttpError(404, 'Hall not found');

  const layout = await db.HallLayout.findOne({
    where: { hallId: hall.id },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!layout) throw new HttpError(409, 'Seat layout not configured');

  const absoluteSeatCodes = requestedSeatCodes.map((seatCode) => {
    const parsed = parseSeatCodeForLayout(layout, seatCode);
    if (!parsed) throw new HttpError(400, `Seat does not exist in layout: ${seatCode}`);
    return parsed.absoluteSeatCode;
  });

  await db.SeatHold.update(
    { status: HOLD_STATUS.RELEASED },
    {
      where: {
        showId: show.id,
        seatCode: { [Op.in]: absoluteSeatCodes },
        userId,
        sessionToken,
        status: HOLD_STATUS.HELD,
      },
      transaction: t,
    }
  );

  return {
    showId: show.id,
    seatCodes: requestedSeatCodes,
  };
}

function clearOtpRecordsForShow({ userId, showId }) {
  const prefix = `${userId}:${showId}:`;
  for (const key of otpStore.keys()) {
    if (key.startsWith(prefix)) otpStore.delete(key);
  }
}

async function createHold(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = createHoldSchema.parse(req.body);
    const show = await db.Show.findByPk(body.showId, { transaction: t, lock: t.LOCK.UPDATE });

    if (!show || show.isCancelled || show.isBlocked || !show.isApproved) {
      throw new HttpError(404, 'Show not available');
    }
    if (!isShowBookingOpen(show)) throw new HttpError(409, 'Show booking closed');

    await cleanupExpiredHolds(t);

    const requestedSeatCodes = Array.from(
      new Set(body.seatCodes.map((s) => String(s).toUpperCase().trim()))
    );

    if (requestedSeatCodes.length < 1) throw new HttpError(400, 'Select at least 1 seat');
    if (requestedSeatCodes.length > 10) throw new HttpError(400, 'Select at most 10 seats');

    const hall = await db.Hall.findByPk(show.hallId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!hall) throw new HttpError(404, 'Hall not found');

    const layout = await db.HallLayout.findOne({
      where: { hallId: hall.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!layout) throw new HttpError(409, 'Seat layout not configured');

    const parsedSeats = requestedSeatCodes.map((seatCode) => {
      const parsed = parseSeatCodeForLayout(layout, seatCode);
      if (!parsed) throw new HttpError(400, `Seat does not exist in layout: ${seatCode}`);
      return parsed;
    });
    const absoluteSeatCodes = parsedSeats.map((seat) => seat.absoluteSeatCode);
    const publicSeatCodes = parsedSeats.map((seat) => seat.publicSeatCode);

    const alreadyBooked = await db.BookingSeat.findAll({
      where: { showId: show.id, seatCode: { [Op.in]: absoluteSeatCodes } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (alreadyBooked.length) throw new HttpError(409, 'Some seats are already booked');

    const holdDurationMs = Number(env.seatHoldMs ?? 120000);
    const expiresAt = new Date(Date.now() + holdDurationMs);

    for (const seatCode of absoluteSeatCodes) {
      // eslint-disable-next-line no-await-in-loop
      await claimSeatHold({
      t,
      showId: show.id,
      seatCode,
      userId: req.user.id,
      sessionToken: body.sessionToken,
      expiresAt,
    });
  }

    await t.commit();

    res.status(201).json({
      showId: show.id,
      seatCodes: publicSeatCodes,
      expiresAt,
      holdMs: holdDurationMs,
    });
  } catch (e) {
    if (!t.finished) await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function confirmBooking(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = confirmSchema.parse(req.body);
    const requestedSeatCodes = Array.from(
      new Set(body.seatCodes.map((s) => String(s).toUpperCase().trim()))
    );
    const normalizedEmail = String(body.email).trim().toLowerCase();

    const otpRecord = otpStore.get(
      otpKey({
        userId: req.user.id,
        showId: body.showId,
        email: normalizedEmail,
      })
    );
    if (!otpRecord?.verifiedAt || otpRecord.expiresAt <= Date.now()) {
      throw new HttpError(400, 'Payment OTP verification is required');
    }

    await refreshSeatHoldsForCheckout({
      t,
      showId: body.showId,
      seatCodes: requestedSeatCodes,
      userId: req.user.id,
      sessionToken: body.sessionToken,
    });

    const show = await db.Show.findByPk(body.showId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
      include: [
        { model: db.Movie },
        { model: db.Hall, include: [{ model: db.Theater }] },
      ],
    });
    if (!show || show.isCancelled || show.isBlocked || !show.isApproved) {
      throw new HttpError(404, 'Show not available');
    }
    if (!isShowBookingOpen(show)) throw new HttpError(409, 'Show booking closed');

    const hall = await db.Hall.findByPk(show.hallId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!hall) throw new HttpError(404, 'Hall not found');

    const layout = await db.HallLayout.findOne({
      where: { hallId: hall.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!layout) throw new HttpError(409, 'Seat layout not configured');

    const parsedSeats = requestedSeatCodes.map((seatCode) => {
      const parsed = parseSeatCodeForLayout(layout, seatCode);
      if (!parsed) throw new HttpError(400, `Seat does not exist in layout: ${seatCode}`);
      return parsed;
    });
    const absoluteSeatCodes = parsedSeats.map((seat) => seat.absoluteSeatCode);
    const publicSeatCodes = parsedSeats.map((seat) => seat.publicSeatCode);

    const alreadyBooked = await db.BookingSeat.findAll({
      where: { showId: show.id, seatCode: { [Op.in]: absoluteSeatCodes } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (alreadyBooked.length) throw new HttpError(409, 'Some seats are already booked');

    const seatTypes = await db.SeatType.findAll({ transaction: t });
    const seatTypeById = new Map(seatTypes.map((st) => [String(st.id), st]));

    const showPrices = await db.ShowSeatPrice.findAll({
      where: { showId: show.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const priceByTypeCode = new Map();
    for (const row of showPrices) {
      const seatType = seatTypeById.get(String(row.seatTypeId));
      if (seatType) {
        priceByTypeCode.set(String(seatType.code).toLowerCase(), Number(row.price));
      }
    }

    let totalAmount = 0;
    const seatMeta = [];

    for (const parsed of parsedSeats) {
      const typeCode = seatTypeForSeat(layout, parsed.rowIdx, parsed.colIdx) || DEFAULT_SEAT_TYPE;
      const normalizedTypeCode = String(typeCode).toLowerCase();
      const price = priceByTypeCode.get(normalizedTypeCode) ?? 0;

      totalAmount += price;
      seatMeta.push({
        seatCode: parsed.absoluteSeatCode,
        publicSeatCode: toPublicSeatCode(layout, parsed.rowIdx, parsed.colIdx),
        typeCode: normalizedTypeCode,
        price,
      });
    }

    const booking = await db.Booking.create(
      {
        showId: show.id,
        userId: req.user.id,
        status: BOOKING_STATUS.CONFIRMED,
        totalAmount,
      },
      { transaction: t }
    );

    for (const { seatCode, typeCode, price } of seatMeta) {
      const seatType = seatTypes.find((st) => String(st.code).toLowerCase() === typeCode) || null;

      // eslint-disable-next-line no-await-in-loop
      await db.BookingSeat.create(
        {
          bookingId: booking.id,
          showId: show.id,
          seatCode,
          seatTypeId: seatType ? seatType.id : null,
          price,
        },
        { transaction: t }
      );
    }

    await db.SeatHold.update(
      { status: HOLD_STATUS.RELEASED },
      {
        where: {
          showId: show.id,
          seatCode: { [Op.in]: absoluteSeatCodes },
          sessionToken: body.sessionToken,
          status: HOLD_STATUS.HELD,
        },
        transaction: t,
      }
    );

    await t.commit();
    otpStore.delete(
      otpKey({
        userId: req.user.id,
        showId: body.showId,
        email: normalizedEmail,
      })
    );
    res.status(201).json({
      bookingId: booking.id,
      showId: show.id,
      seatCodes: publicSeatCodes,
      totalAmount,
      ticket: buildBookingTicket({ booking, seatMeta, show }),
    });
  } catch (e) {
    if (!t.finished) await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function listMyBookings(req, res, next) {
  try {
    const bookings = await db.Booking.findAll({
      where: {
        userId: req.user.id,
        status: BOOKING_STATUS.CONFIRMED,
      },
      include: [
        {
          model: db.Show,
          include: [
            { model: db.Movie },
            { model: db.Hall, include: [{ model: db.Theater }] },
          ],
        },
        {
          model: db.BookingSeat,
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const hallIds = Array.from(
      new Set(bookings.map((booking) => booking.Show?.hallId).filter(Boolean))
    );
    const layouts = await db.HallLayout.findAll({
      where: { hallId: { [Op.in]: hallIds } },
    });
    const layoutByHallId = new Map(layouts.map((layout) => [String(layout.hallId), layout]));

    const tickets = bookings.map((booking) => {
      const layout = layoutByHallId.get(String(booking.Show?.hallId));
      const seatMeta = (booking.BookingSeats || []).map((seat) => {
        const parsed = layout ? parseSeatCodeForLayout(layout, seat.seatCode) : null;
        return {
          publicSeatCode: parsed?.publicSeatCode || seat.seatCode,
          typeCode: null,
          price: Number(seat.price),
        };
      });

      return buildBookingTicket({
        booking,
        seatMeta,
        show: booking.Show,
      });
    });

    res.json({ bookings: tickets });
  } catch (e) {
    next(e);
  }
}

async function sendPaymentOtp(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = sendOtpSchema.parse(req.body);
    const normalizedEmail = String(body.email).trim().toLowerCase();

    if (normalizedEmail !== String(req.user.email).trim().toLowerCase()) {
      throw new HttpError(400, 'Use your registered account email for OTP verification');
    }

    const holdState = await refreshSeatHoldsForCheckout({
      t,
      showId: body.showId,
      seatCodes: body.seatCodes,
      userId: req.user.id,
      sessionToken: body.sessionToken,
    });
    await t.commit();

    const otp = generateOtp();
    const key = otpKey({
      userId: req.user.id,
      showId: body.showId,
      email: normalizedEmail,
    });

    otpStore.set(key, {
      otp,
      expiresAt: Date.now() + env.auth.paymentOtpExpiresMs,
    });

    await sendOtpEmail(normalizedEmail, req.user.name, otp);

    res.json({
      ok: true,
      expiresInMs: env.auth.paymentOtpExpiresMs,
      expiresAt: holdState.expiresAt,
      holdMs: holdState.holdMs,
      message: 'OTP sent to your registered email address',
    });
  } catch (e) {
    if (!t.finished) await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function verifyPaymentOtp(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = verifyOtpSchema.parse(req.body);
    const normalizedEmail = String(body.email).trim().toLowerCase();

    const key = otpKey({
      userId: req.user.id,
      showId: body.showId,
      email: normalizedEmail,
    });

    const record = otpStore.get(key);
    if (!record) throw new HttpError(400, 'OTP not requested for this payment');
    if (record.expiresAt <= Date.now()) {
      otpStore.delete(key);
      throw new HttpError(400, 'OTP expired. Request a new one');
    }
    if (record.otp !== body.otp) throw new HttpError(400, 'Invalid OTP');

    const holdState = await refreshSeatHoldsForCheckout({
      t,
      showId: body.showId,
      seatCodes: body.seatCodes,
      userId: req.user.id,
      sessionToken: body.sessionToken,
    });
    await t.commit();

    otpStore.set(key, {
      ...record,
      verifiedAt: Date.now(),
    });

    res.json({
      ok: true,
      expiresAt: holdState.expiresAt,
      holdMs: holdState.holdMs,
      message: 'OTP verified successfully',
    });
  } catch (e) {
    if (!t.finished) await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function releaseHold(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = releaseHoldSchema.parse(req.body);

    const releaseState = await releaseSeatHolds({
      t,
      showId: body.showId,
      seatCodes: body.seatCodes,
      userId: req.user.id,
      sessionToken: body.sessionToken,
    });
    await t.commit();

    clearOtpRecordsForShow({ userId: req.user.id, showId: body.showId });

    res.json({
      ok: true,
      showId: releaseState.showId,
      seatCodes: releaseState.seatCodes,
    });
  } catch (e) {
    if (!t.finished) await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

module.exports = {
  createHold,
  confirmBooking,
  cleanupExpiredHolds,
  listMyBookings,
  sendPaymentOtp,
  verifyPaymentOtp,
  releaseHold,
};
