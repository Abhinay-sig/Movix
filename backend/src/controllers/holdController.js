const { z } = require('zod');
const { Op, UniqueConstraintError } = require('sequelize');
const { env } = require('../config/env');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');
const {
  createCheckoutOrder,
  fetchOrder,
  fetchPayment,
  getCheckoutConfig,
  getCheckoutDisplayName,
  isRazorpayConfigured,
  toRazorpayAmount,
  verifyPaymentSignature,
} = require('../services/razorpayService');
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

const createPaymentOrderSchema = z.object({
  showId: z.coerce.number().int().positive(),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
  email: z.string().email().max(320),
  sessionToken: z.string().min(8).max(96),
  useMovixCoins: z.boolean().optional(),
});

const confirmSchema = z.object({
  showId: z.coerce.number().int().positive(),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
  email: z.string().email().max(320),
  sessionToken: z.string().min(8).max(96),
  useMovixCoins: z.boolean().optional(),
});

const verifyPaymentSchema = z.object({
  showId: z.coerce.number().int().positive(),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
  email: z.string().email().max(320),
  sessionToken: z.string().min(8).max(96),
  razorpayOrderId: z.string().min(8).max(128),
  razorpayPaymentId: z.string().min(8).max(128),
  razorpaySignature: z.string().min(8).max(255),
  useMovixCoins: z.boolean().optional(),
});

const releaseHoldSchema = z.object({
  showId: z.coerce.number().int().positive(),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
  sessionToken: z.string().min(8).max(96),
});

function isShowBookingOpen(show) {
  const startsAtMs = new Date(show?.startsAt).getTime();
  return Number.isFinite(startsAtMs) && startsAtMs > Date.now();
}

function isUniqueConstraintError(err) {
  return (
    err instanceof UniqueConstraintError ||
    err?.name === 'SequelizeUniqueConstraintError' ||
    err?.parent?.code === '23505' ||
    err?.parent?.code === 'ER_DUP_ENTRY' ||
    err?.original?.code === '23505' ||
    err?.original?.code === 'ER_DUP_ENTRY'
  );
}

function normalizeSeatCodes(seatCodes) {
  return Array.from(new Set(seatCodes.map((seatCode) => String(seatCode).toUpperCase().trim())));
}

function assertRegisteredEmail(req, email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (normalizedEmail !== String(req.user.email || '').trim().toLowerCase()) {
    throw new HttpError(400, 'Use your registered account email address for checkout');
  }
  return normalizedEmail;
}

function buildReceiptNumber({ showId, userId }) {
  return `mvx-${showId}-${userId}-${Date.now()}`;
}

function getPaymentSlipLabel(ticket) {
  const paymentId = ticket?.payment?.paymentId;
  return paymentId ? `Razorpay payment ${paymentId}` : 'Razorpay payment receipt';
}

function getWalletPaymentSummary({ user, totalAmount, useMovixCoins }) {
  const proExpiresMs = user?.proExpiresAt ? new Date(user.proExpiresAt).getTime() : 0;
  const isProActive = Number.isFinite(proExpiresMs) && proExpiresMs > Date.now();
  const coinBalance = Number(user?.movixCoinsBalance || 0);
  const redeemableCoins =
    useMovixCoins && isProActive ? Math.min(Math.floor(Number(totalAmount || 0)), coinBalance) : 0;
  const payableAmount = Math.max(0, Number(totalAmount || 0) - redeemableCoins);
  const cashbackCoins = isProActive ? Math.floor(payableAmount * 0.1) : 0;

  return {
    isProActive,
    redeemableCoins,
    payableAmount,
    cashbackCoins,
  };
}

function buildBookingTicket({ booking, seatMeta, show }) {
  const payment = {
    provider: booking.paymentProvider || 'razorpay',
    status: booking.paymentStatus || 'captured',
    method: booking.paymentMethod || null,
    orderId: booking.paymentOrderId || null,
    paymentId: booking.paymentId || null,
    signature: booking.paymentSignature || null,
    receiptNumber: booking.receiptNumber || null,
    customerEmail: booking.customerEmail || null,
    paidAt: booking.createdAt,
    proofLabel: getPaymentSlipLabel({ payment: { paymentId: booking.paymentId } }),
  };

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
    payment,
    bookedAt: booking.createdAt,
  };
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

async function getLockedLayout({ t, show }) {
  const hall = await db.Hall.findByPk(show.hallId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!hall) throw new HttpError(404, 'Hall not found');

  const layout = await db.HallLayout.findOne({
    where: { hallId: hall.id },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!layout) throw new HttpError(409, 'Seat layout not configured');

  return { hall, layout };
}

async function buildCheckoutContext({ t, showId, seatCodes, userId, sessionToken }) {
  const requestedSeatCodes = normalizeSeatCodes(seatCodes);
  if (requestedSeatCodes.length < 1) throw new HttpError(400, 'Select at least 1 seat');
  if (requestedSeatCodes.length > 10) throw new HttpError(400, 'Select at most 10 seats');

  const show = await db.Show.findByPk(showId, {
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

  await cleanupExpiredHolds(t);

  const { layout } = await getLockedLayout({ t, show });

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

  const holds = await db.SeatHold.findAll({
    where: {
      showId: show.id,
      seatCode: { [Op.in]: absoluteSeatCodes },
      status: HOLD_STATUS.HELD,
    },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (holds.length !== absoluteSeatCodes.length) {
    throw new HttpError(409, 'Seat hold expired');
  }

  const holdBySeatCode = new Map(holds.map((hold) => [String(hold.seatCode), hold]));
  let latestExpiryMs = 0;

  for (const seatCode of absoluteSeatCodes) {
    const hold = holdBySeatCode.get(String(seatCode));
    if (!hold) throw new HttpError(409, 'Seat hold expired');

    const expiresAtMs = new Date(hold.expiresAt).getTime();
    const isExpired = Number.isFinite(expiresAtMs) ? expiresAtMs <= Date.now() : true;
    if (isExpired) throw new HttpError(409, 'Seat hold expired');

    const belongsToUser = String(hold.userId) === String(userId);
    const belongsToSession = String(hold.sessionToken || '') === String(sessionToken || '');
    if (!belongsToUser || !belongsToSession) {
      throw new HttpError(409, 'Seat hold expired');
    }

    latestExpiryMs = Math.max(latestExpiryMs, expiresAtMs);
  }

  const seatTypes = await db.SeatType.findAll({ transaction: t });
  const seatTypeById = new Map(seatTypes.map((seatType) => [String(seatType.id), seatType]));

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
      seatTypeId:
        seatTypes.find((seatType) => String(seatType.code).toLowerCase() === normalizedTypeCode)?.id || null,
      price,
    });
  }

  return {
    show,
    seatMeta,
    absoluteSeatCodes,
    publicSeatCodes,
    totalAmount,
    expiresAt: new Date(latestExpiryMs),
    holdMs: Math.max(0, latestExpiryMs - Date.now()),
  };
}

async function releaseSeatHolds({ t, showId, seatCodes, userId, sessionToken }) {
  const requestedSeatCodes = normalizeSeatCodes(seatCodes);
  if (requestedSeatCodes.length < 1) throw new HttpError(400, 'Select at least 1 seat');
  if (requestedSeatCodes.length > 10) throw new HttpError(400, 'Select at most 10 seats');

  const show = await db.Show.findByPk(showId, { transaction: t, lock: t.LOCK.UPDATE });
  if (!show) throw new HttpError(404, 'Show not available');

  const { layout } = await getLockedLayout({ t, show });

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

async function createHold(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = createHoldSchema.parse(req.body);
    const requestedSeatCodes = normalizeSeatCodes(body.seatCodes);

    const show = await db.Show.findByPk(body.showId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!show || show.isCancelled || show.isBlocked || !show.isApproved) {
      throw new HttpError(404, 'Show not available');
    }
    if (!isShowBookingOpen(show)) throw new HttpError(409, 'Show booking closed');

    await cleanupExpiredHolds(t);

    const { layout } = await getLockedLayout({ t, show });
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

    const holdDurationMs = Number(env.seatHoldMs ?? 300000);
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
    const normalizedEmail = assertRegisteredEmail(req, body.email);
    const checkout = await buildCheckoutContext({
      t,
      showId: body.showId,
      seatCodes: body.seatCodes,
      userId: req.user.id,
      sessionToken: body.sessionToken,
    });

    const user = await db.User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw new HttpError(404, 'User not found');

    const wallet = getWalletPaymentSummary({
      user,
      totalAmount: checkout.totalAmount,
      useMovixCoins: Boolean(body.useMovixCoins),
    });

    if (wallet.payableAmount > 0) {
      throw new HttpError(400, 'This booking still needs Razorpay payment');
    }

    const booking = await db.Booking.create(
      {
        showId: checkout.show.id,
        userId: req.user.id,
        status: BOOKING_STATUS.CONFIRMED,
        totalAmount: wallet.payableAmount,
        customerEmail: normalizedEmail,
        receiptNumber: buildReceiptNumber({ showId: body.showId, userId: req.user.id }),
        paymentProvider: 'movix_coins',
        paymentStatus: 'captured',
        paymentMethod: wallet.redeemableCoins > 0 ? 'movix_coins' : 'complimentary',
      },
      { transaction: t }
    );

    for (const { seatCode, seatTypeId, price } of checkout.seatMeta) {
      // eslint-disable-next-line no-await-in-loop
      await db.BookingSeat.create(
        {
          bookingId: booking.id,
          showId: checkout.show.id,
          seatCode,
          seatTypeId,
          price,
        },
        { transaction: t }
      );
    }

    await db.SeatHold.update(
      { status: HOLD_STATUS.RELEASED },
      {
        where: {
          showId: checkout.show.id,
          seatCode: { [Op.in]: checkout.absoluteSeatCodes },
          sessionToken: body.sessionToken,
          status: HOLD_STATUS.HELD,
        },
        transaction: t,
      }
    );

    if (wallet.isProActive && wallet.redeemableCoins > 0) {
      user.movixCoinsBalance = Math.max(0, Number(user.movixCoinsBalance || 0) - wallet.redeemableCoins);
      user.movixCoinsRedeemedTotal =
        Number(user.movixCoinsRedeemedTotal || 0) + wallet.redeemableCoins;

      await db.MovixCoinTransaction.create(
        {
          userId: user.id,
          bookingId: booking.id,
          type: db.MOVIX_COIN_TX_TYPES.BOOKING_DEBIT,
          coins: -wallet.redeemableCoins,
          note: `MovixCoins redeemed on booking #${booking.id}`,
        },
        { transaction: t }
      );
    }

    if (wallet.isProActive && wallet.cashbackCoins > 0) {
      user.movixCoinsBalance = Number(user.movixCoinsBalance || 0) + wallet.cashbackCoins;
      user.movixCoinsEarnedTotal = Number(user.movixCoinsEarnedTotal || 0) + wallet.cashbackCoins;

      await db.MovixCoinTransaction.create(
        {
          userId: user.id,
          bookingId: booking.id,
          type: db.MOVIX_COIN_TX_TYPES.CASHBACK_CREDIT,
          coins: wallet.cashbackCoins,
          note: `10% cashback for booking #${booking.id}`,
        },
        { transaction: t }
      );
    }

    if (wallet.isProActive) {
      await user.save({ transaction: t });
    }

    await t.commit();

    res.status(201).json({
      bookingId: booking.id,
      showId: checkout.show.id,
      seatCodes: checkout.publicSeatCodes,
      totalAmount: wallet.payableAmount,
      subTotalAmount: checkout.totalAmount,
      movixCoinsUsed: wallet.redeemableCoins,
      movixCoinsCashback: wallet.cashbackCoins,
      wallet: {
        currentBalance: Number(user.movixCoinsBalance || 0),
        totalEarned: Number(user.movixCoinsEarnedTotal || 0),
        totalRedeemed: Number(user.movixCoinsRedeemedTotal || 0),
      },
      ticket: buildBookingTicket({
        booking,
        seatMeta: checkout.seatMeta,
        show: checkout.show,
      }),
    });
  } catch (e) {
    if (!t.finished) await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function createRazorpayOrder(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    if (!isRazorpayConfigured()) {
      throw new HttpError(503, 'Razorpay is not configured on the server');
    }

    const body = createPaymentOrderSchema.parse(req.body);
    const normalizedEmail = assertRegisteredEmail(req, body.email);
    const checkout = await buildCheckoutContext({
      t,
      showId: body.showId,
      seatCodes: body.seatCodes,
      userId: req.user.id,
      sessionToken: body.sessionToken,
    });
    const user = await db.User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw new HttpError(404, 'User not found');
    const wallet = getWalletPaymentSummary({
      user,
      totalAmount: checkout.totalAmount,
      useMovixCoins: Boolean(body.useMovixCoins),
    });
    if (wallet.payableAmount <= 0) {
      throw new HttpError(400, 'This booking does not require Razorpay payment');
    }

    const receipt = buildReceiptNumber({ showId: body.showId, userId: req.user.id });
    const order = await createCheckoutOrder({
      amount: wallet.payableAmount,
      receipt,
      notes: {
        userId: String(req.user.id),
        showId: String(body.showId),
        email: normalizedEmail,
        sessionToken: body.sessionToken,
        seatCodes: checkout.publicSeatCodes.join(','),
        useMovixCoins: wallet.redeemableCoins > 0 ? 'true' : 'false',
        movixCoinsUsed: String(wallet.redeemableCoins),
      },
    });

    await t.commit();

    res.status(201).json({
      order: {
        id: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        receipt: order.receipt,
      },
      checkout: {
        key: getCheckoutConfig().keyId,
        name: getCheckoutDisplayName(),
        description: `${checkout.show.Movie?.title || 'Movie'} booking`,
        amount: wallet.payableAmount,
        email: normalizedEmail,
        seatCodes: checkout.publicSeatCodes,
        expiresAt: checkout.expiresAt,
        holdMs: checkout.holdMs,
        subTotalAmount: checkout.totalAmount,
        movixCoinsUsed: wallet.redeemableCoins,
      },
    });
  } catch (e) {
    if (!t.finished) await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function fetchExistingBookingTicket({ paymentId, userId, transaction }) {
  const booking = await db.Booking.findOne({
    where: {
      paymentId,
      userId,
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
        include: [{ model: db.SeatType, required: false }],
      },
    ],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!booking) return null;

  const hallId = booking.Show?.hallId;
  const layout = hallId
    ? await db.HallLayout.findOne({ where: { hallId }, transaction })
    : null;

  const seatMeta = (booking.BookingSeats || []).map((seat) => {
    const parsed = layout ? parseSeatCodeForLayout(layout, seat.seatCode) : null;
    return {
      publicSeatCode: parsed?.publicSeatCode || seat.seatCode,
      typeCode: seat.SeatType?.code || DEFAULT_SEAT_TYPE,
      price: Number(seat.price),
    };
  });

  return buildBookingTicket({
    booking,
    seatMeta,
    show: booking.Show,
  });
}

async function verifyRazorpayPayment(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    if (!isRazorpayConfigured()) {
      throw new HttpError(503, 'Razorpay is not configured on the server');
    }

    const body = verifyPaymentSchema.parse(req.body);
    const normalizedEmail = assertRegisteredEmail(req, body.email);

    const existingTicket = await fetchExistingBookingTicket({
      paymentId: body.razorpayPaymentId,
      userId: req.user.id,
      transaction: t,
    });
    if (existingTicket) {
      await t.commit();
      return res.json({
        bookingId: existingTicket.bookingId,
        showId: existingTicket.show.showId,
        seatCodes: existingTicket.seats.map((seat) => seat.seatCode),
        totalAmount: existingTicket.totalAmount,
        ticket: existingTicket,
      });
    }

    const checkout = await buildCheckoutContext({
      t,
      showId: body.showId,
      seatCodes: body.seatCodes,
      userId: req.user.id,
      sessionToken: body.sessionToken,
    });
    const user = await db.User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw new HttpError(404, 'User not found');
    const wallet = getWalletPaymentSummary({
      user,
      totalAmount: checkout.totalAmount,
      useMovixCoins: Boolean(body.useMovixCoins),
    });

    verifyPaymentSignature({
      orderId: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature,
    });

    const [razorpayOrder, razorpayPayment] = await Promise.all([
      fetchOrder(body.razorpayOrderId),
      fetchPayment(body.razorpayPaymentId),
    ]);

    if (!razorpayOrder || razorpayOrder.id !== body.razorpayOrderId) {
      throw new HttpError(400, 'Unable to validate Razorpay order');
    }
    if (!razorpayPayment || razorpayPayment.id !== body.razorpayPaymentId) {
      throw new HttpError(400, 'Unable to validate Razorpay payment');
    }
    if (String(razorpayPayment.order_id || '') !== String(body.razorpayOrderId)) {
      throw new HttpError(400, 'Payment does not belong to this Razorpay order');
    }
    if (!['authorized', 'captured'].includes(String(razorpayPayment.status || '').toLowerCase())) {
      throw new HttpError(400, 'Payment has not been captured by Razorpay');
    }

    const expectedAmount = toRazorpayAmount(wallet.payableAmount);
    if (Number(razorpayOrder.amount) !== expectedAmount || Number(razorpayPayment.amount) !== expectedAmount) {
      throw new HttpError(400, 'Razorpay amount does not match the booking total');
    }
    if (String(razorpayOrder.currency || '').toUpperCase() !== 'INR') {
      throw new HttpError(400, 'Unsupported Razorpay currency');
    }

    const notes = razorpayOrder.notes || {};
    if (
      String(notes.userId || '') !== String(req.user.id) ||
      String(notes.showId || '') !== String(body.showId) ||
      String(notes.email || '').trim().toLowerCase() !== normalizedEmail ||
      String(notes.sessionToken || '') !== String(body.sessionToken) ||
      String(notes.seatCodes || '') !== checkout.publicSeatCodes.join(',') ||
      String(notes.useMovixCoins || 'false') !== (wallet.redeemableCoins > 0 ? 'true' : 'false') ||
      Number(notes.movixCoinsUsed || 0) !== wallet.redeemableCoins
    ) {
      throw new HttpError(400, 'Razorpay order details do not match this booking');
    }

    const booking = await db.Booking.create(
      {
        showId: checkout.show.id,
        userId: req.user.id,
        status: BOOKING_STATUS.CONFIRMED,
        totalAmount: wallet.payableAmount,
        customerEmail: normalizedEmail,
        receiptNumber: razorpayOrder.receipt || buildReceiptNumber({ showId: body.showId, userId: req.user.id }),
        paymentProvider: 'razorpay',
        paymentStatus: String(razorpayPayment.status || 'captured').toLowerCase(),
        paymentMethod: razorpayPayment.method || null,
        paymentOrderId: body.razorpayOrderId,
        paymentId: body.razorpayPaymentId,
        paymentSignature: body.razorpaySignature,
      },
      { transaction: t }
    );

    for (const { seatCode, seatTypeId, price } of checkout.seatMeta) {
      // eslint-disable-next-line no-await-in-loop
      await db.BookingSeat.create(
        {
          bookingId: booking.id,
          showId: checkout.show.id,
          seatCode,
          seatTypeId,
          price,
        },
        { transaction: t }
      );
    }

    await db.SeatHold.update(
      { status: HOLD_STATUS.RELEASED },
      {
        where: {
          showId: checkout.show.id,
          seatCode: { [Op.in]: checkout.absoluteSeatCodes },
          sessionToken: body.sessionToken,
          status: HOLD_STATUS.HELD,
        },
        transaction: t,
      }
    );

    if (wallet.isProActive && wallet.redeemableCoins > 0) {
      user.movixCoinsBalance = Math.max(0, Number(user.movixCoinsBalance || 0) - wallet.redeemableCoins);
      user.movixCoinsRedeemedTotal =
        Number(user.movixCoinsRedeemedTotal || 0) + wallet.redeemableCoins;

      await db.MovixCoinTransaction.create(
        {
          userId: user.id,
          bookingId: booking.id,
          type: db.MOVIX_COIN_TX_TYPES.BOOKING_DEBIT,
          coins: -wallet.redeemableCoins,
          note: `MovixCoins redeemed on booking #${booking.id}`,
        },
        { transaction: t }
      );
    }

    if (wallet.isProActive && wallet.cashbackCoins > 0) {
      user.movixCoinsBalance = Number(user.movixCoinsBalance || 0) + wallet.cashbackCoins;
      user.movixCoinsEarnedTotal = Number(user.movixCoinsEarnedTotal || 0) + wallet.cashbackCoins;

      await db.MovixCoinTransaction.create(
        {
          userId: user.id,
          bookingId: booking.id,
          type: db.MOVIX_COIN_TX_TYPES.CASHBACK_CREDIT,
          coins: wallet.cashbackCoins,
          note: `10% cashback for booking #${booking.id}`,
        },
        { transaction: t }
      );
    }

    if (wallet.isProActive) {
      await user.save({ transaction: t });
    }

    await t.commit();

    res.status(201).json({
      bookingId: booking.id,
      showId: checkout.show.id,
      seatCodes: checkout.publicSeatCodes,
      totalAmount: wallet.payableAmount,
      subTotalAmount: checkout.totalAmount,
      movixCoinsUsed: wallet.redeemableCoins,
      movixCoinsCashback: wallet.cashbackCoins,
      wallet: {
        currentBalance: Number(user.movixCoinsBalance || 0),
        totalEarned: Number(user.movixCoinsEarnedTotal || 0),
        totalRedeemed: Number(user.movixCoinsRedeemedTotal || 0),
      },
      ticket: buildBookingTicket({
        booking,
        seatMeta: checkout.seatMeta,
        show: checkout.show,
      }),
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
          include: [{ model: db.SeatType, required: false }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const hallIds = Array.from(new Set(bookings.map((booking) => booking.Show?.hallId).filter(Boolean)));
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
          typeCode: seat.SeatType?.code || DEFAULT_SEAT_TYPE,
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
  createRazorpayOrder,
  verifyRazorpayPayment,
  cleanupExpiredHolds,
  listMyBookings,
  releaseHold,
};
