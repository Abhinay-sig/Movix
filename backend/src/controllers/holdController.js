const { z } = require('zod');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { env } = require('../config/env');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');
const { parseSeatCode, layoutHasSeat, seatTypeForSeat } = require('../utils/seatLayout');

const createHoldSchema = z.object({
  showId: z.coerce.number().int().positive(),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
});

async function cleanupExpiredHolds() {
  const now = new Date();
  await db.SeatHold.update(
    { status: db.HOLD_STATUS.RELEASED },
    {
      where: {
        status: db.HOLD_STATUS.HELD,
        expiresAt: { [Op.lte]: now },
      },
    }
  );
}

async function createHold(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = createHoldSchema.parse(req.body);
    const show = await db.Show.findByPk(body.showId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!show || show.isCancelled || show.isBlocked || !show.isApproved) {
      throw new HttpError(404, 'Show not available');
    }

    await cleanupExpiredHolds();

    const seatCodes = Array.from(new Set(body.seatCodes.map((s) => s.toUpperCase().trim())));
    if (seatCodes.length < 1) throw new HttpError(400, 'Select at least 1 seat');
    if (seatCodes.length > 10) throw new HttpError(400, 'Select at most 10 seats');

    const hall = await db.Hall.findByPk(show.hallId, { transaction: t });
    const layout = await db.HallLayout.findOne({ where: { hallId: hall.id }, transaction: t });
    if (!layout) throw new HttpError(409, 'Seat layout not configured');

    for (const seatCode of seatCodes) {
      const parsed = parseSeatCode(seatCode);
      if (!parsed) throw new HttpError(400, `Invalid seat code: ${seatCode}`);
      if (!layoutHasSeat(layout, parsed.rowIdx, parsed.colIdx)) {
        throw new HttpError(400, `Seat does not exist in layout: ${seatCode}`);
      }
    }

    // 1) Reject if already booked (hard constraint).
    const alreadyBooked = await db.BookingSeat.findAll({
      where: { showId: show.id, seatCode: { [Op.in]: seatCodes } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (alreadyBooked.length) throw new HttpError(409, 'Some seats are already booked');

    // 2) Lock existing hold rows (if any) for these seats.
    const existingHolds = await db.SeatHold.findAll({
      where: { showId: show.id, seatCode: { [Op.in]: seatCodes } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const now = dayjs();
    const expiresAt = now.add(env.seatHoldMs, 'millisecond').toDate();

    const existingBySeat = new Map(existingHolds.map((h) => [h.seatCode, h]));
    for (const seatCode of seatCodes) {
      const hold = existingBySeat.get(seatCode);
      if (!hold) continue;

      const isExpired = dayjs(hold.expiresAt).isBefore(now);
      const isActiveHeld = hold.status === db.HOLD_STATUS.HELD && !isExpired;
      const heldByOther = isActiveHeld && String(hold.userId) !== String(req.user.id);

      if (heldByOther) {
        throw new HttpError(409, 'Some seats are temporarily locked by another user');
      }
    }

    // 3) Upsert holds: create missing; refresh ours; reclaim expired/released.
    for (const seatCode of seatCodes) {
      const hold = existingBySeat.get(seatCode);
      if (!hold) {
        // eslint-disable-next-line no-await-in-loop
        await db.SeatHold.create(
          {
            showId: show.id,
            seatCode,
            userId: req.user.id,
            status: db.HOLD_STATUS.HELD,
            expiresAt,
          },
          { transaction: t }
        );
      } else {
        // eslint-disable-next-line no-await-in-loop
        await hold.update(
          { userId: req.user.id, status: db.HOLD_STATUS.HELD, expiresAt },
          { transaction: t }
        );
      }
    }

    await t.commit();

    res.status(201).json({
      showId: show.id,
      seatCodes,
      expiresAt,
      holdMs: env.seatHoldMs,
    });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

const confirmSchema = z.object({
  showId: z.coerce.number().int().positive(),
  seatCodes: z.array(z.string().min(2).max(16)).min(1).max(10),
});

async function confirmBooking(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = confirmSchema.parse(req.body);
    const seatCodes = Array.from(new Set(body.seatCodes.map((s) => s.toUpperCase().trim())));

    const show = await db.Show.findByPk(body.showId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!show || show.isCancelled || show.isBlocked || !show.isApproved) {
      throw new HttpError(404, 'Show not available');
    }

    const hall = await db.Hall.findByPk(show.hallId, { transaction: t });
    const layout = await db.HallLayout.findOne({ where: { hallId: hall.id }, transaction: t });
    if (!layout) throw new HttpError(409, 'Seat layout not configured');

    for (const seatCode of seatCodes) {
      const parsed = parseSeatCode(seatCode);
      if (!parsed) throw new HttpError(400, `Invalid seat code: ${seatCode}`);
      if (!layoutHasSeat(layout, parsed.rowIdx, parsed.colIdx)) {
        throw new HttpError(400, `Seat does not exist in layout: ${seatCode}`);
      }
    }

    const now = new Date();

    // Lock holds rows for these seats
    const holds = await db.SeatHold.findAll({
      where: { showId: show.id, seatCode: { [Op.in]: seatCodes } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (holds.length !== seatCodes.length) {
      throw new HttpError(409, 'Seat hold expired');
    }

    for (const h of holds) {
      if (h.status !== db.HOLD_STATUS.HELD) throw new HttpError(409, 'Seat hold expired');
      if (String(h.userId) !== String(req.user.id)) throw new HttpError(409, 'Seat hold expired');
      if (h.expiresAt <= now) throw new HttpError(409, 'Seat hold expired');
    }

    // Hard constraint check again
    const alreadyBooked = await db.BookingSeat.findAll({
      where: { showId: show.id, seatCode: { [Op.in]: seatCodes } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (alreadyBooked.length) throw new HttpError(409, 'Some seats are already booked');

    // Pricing: infer seat type from layout and show seat prices
    const showPrices = await db.ShowSeatPrice.findAll({
      where: { showId: show.id },
      include: [{ model: db.SeatType }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const priceByTypeCode = new Map(showPrices.map((p) => [p.SeatType.code, Number(p.price)]));

    let totalAmount = 0;
    const seatMeta = [];
    for (const seatCode of seatCodes) {
      const parsed = parseSeatCode(seatCode);
      const typeCode = seatTypeForSeat(layout, parsed.rowIdx, parsed.colIdx) ?? db.SEAT_TYPES.STANDARD;
      const price = priceByTypeCode.get(typeCode) ?? 0;
      totalAmount += price;
      seatMeta.push({ seatCode, typeCode, price });
    }

    const booking = await db.Booking.create(
      {
        showId: show.id,
        userId: req.user.id,
        status: db.BOOKING_STATUS.CONFIRMED,
        totalAmount,
      },
      { transaction: t }
    );

    for (const { seatCode, typeCode, price } of seatMeta) {
      const st = showPrices.find((p) => p.SeatType.code === typeCode)?.SeatType ?? null;
      // eslint-disable-next-line no-await-in-loop
      await db.BookingSeat.create(
        { bookingId: booking.id, showId: show.id, seatCode, seatTypeId: st ? st.id : null, price },
        { transaction: t }
      );
    }

    // Release holds
    await db.SeatHold.update(
      { status: db.HOLD_STATUS.RELEASED },
      { where: { showId: show.id, seatCode: { [Op.in]: seatCodes } }, transaction: t }
    );

    await t.commit();
    res.status(201).json({ bookingId: booking.id, showId: show.id, seatCodes, totalAmount });
  } catch (e) {
    await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

module.exports = { createHold, confirmBooking, cleanupExpiredHolds };

