const { z } = require('zod');
const { db } = require('../models');
const { HttpError } = require('../utils/httpError');

const PLANS = Object.freeze({
  monthly: { code: 'monthly', label: 'Monthly', amountRs: 99, durationDays: 30 },
  yearly: { code: 'yearly', label: 'Yearly', amountRs: 999, durationDays: 365 },
});

const subscribeSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

function getDaysLeft(value) {
  const ts = value ? new Date(value).getTime() : 0;
  if (!Number.isFinite(ts)) return 0;
  const diff = ts - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

function toUserPayload(user) {
  const daysLeft = getDaysLeft(user.proExpiresAt);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isEmailVerified: Boolean(user.emailVerifiedAt),
    authProvider: user.authProvider,
    proExpiresAt: user.proExpiresAt,
    isProActive: daysLeft > 0,
    proDaysLeft: daysLeft,
    movixCoinsBalance: Number(user.movixCoinsBalance || 0),
    movixCoinsEarnedTotal: Number(user.movixCoinsEarnedTotal || 0),
    movixCoinsRedeemedTotal: Number(user.movixCoinsRedeemedTotal || 0),
  };
}

async function getProDashboard(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = 10;
    const offset = (page - 1) * limit;

    const user = await db.User.findByPk(req.user.id);
    if (!user) throw new HttpError(404, 'User not found');

    const daysLeft = getDaysLeft(user.proExpiresAt);
    const isProActive = daysLeft > 0;

    const txWhere = { userId: user.id };
    const { rows, count } = await db.MovixCoinTransaction.findAndCountAll({
      where: txWhere,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      user: toUserPayload(user),
      plans: [PLANS.monthly, PLANS.yearly],
      subscription: {
        isProActive,
        proExpiresAt: user.proExpiresAt,
        proDaysLeft: daysLeft,
        shouldHighlightExtend: daysLeft <= 7,
      },
      wallet: {
        currentBalance: Number(user.movixCoinsBalance || 0),
        totalEarned: Number(user.movixCoinsEarnedTotal || 0),
        totalRedeemed: Number(user.movixCoinsRedeemedTotal || 0),
      },
      transactions: {
        items: rows.map((row) => ({
          id: row.id,
          type: row.type,
          coins: Number(row.coins || 0),
          note: row.note,
          bookingId: row.bookingId,
          createdAt: row.createdAt,
        })),
        page,
        pageSize: limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function activatePro(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    const body = subscribeSchema.parse(req.body);
    const plan = PLANS[body.plan];
    if (!plan) throw new HttpError(400, 'Invalid plan');

    const user = await db.User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) throw new HttpError(404, 'User not found');

    const now = Date.now();
    const currentExpiry = user.proExpiresAt ? new Date(user.proExpiresAt).getTime() : 0;
    const baseTs = currentExpiry > now ? currentExpiry : now;
    const nextExpiry = new Date(baseTs + plan.durationDays * 86400000);

    user.proExpiresAt = nextExpiry;
    await user.save({ transaction: t });

    await t.commit();

    res.json({
      ok: true,
      message: `Movix Pro ${plan.label} activated successfully.`,
      plan,
      subscription: {
        isProActive: true,
        proExpiresAt: nextExpiry,
        proDaysLeft: getDaysLeft(nextExpiry),
      },
      user: toUserPayload(user),
    });
  } catch (e) {
    if (!t.finished) await t.rollback();
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

module.exports = { getProDashboard, activatePro, PLANS, getDaysLeft };
