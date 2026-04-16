const { z } = require('zod');
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

const PLANS = Object.freeze({
  monthly: { code: 'monthly', label: 'Monthly', amountRs: 99, durationDays: 30 },
  yearly: { code: 'yearly', label: 'Yearly', amountRs: 999, durationDays: 365 },
});

const subscribeSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

const createProOrderSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
  email: z.string().email().max(320),
});

const verifyProOrderSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
  email: z.string().email().max(320),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function assertRegisteredEmail(req, email) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail !== normalizeEmail(req.user?.email)) {
    throw new HttpError(400, 'Use your registered account email for payment verification');
  }
  return normalizedEmail;
}

function buildProReceiptNumber({ planCode, userId }) {
  const ts = Date.now();
  return `PRO-${String(planCode).toUpperCase()}-${userId}-${ts}`;
}

async function extendProMembership({ userId, planCode, transaction }) {
  const plan = PLANS[planCode];
  if (!plan) throw new HttpError(400, 'Invalid plan');

  const user = await db.User.findByPk(userId, {
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });
  if (!user) throw new HttpError(404, 'User not found');

  const now = Date.now();
  const currentExpiry = user.proExpiresAt ? new Date(user.proExpiresAt).getTime() : 0;
  const baseTs = currentExpiry > now ? currentExpiry : now;
  const nextExpiry = new Date(baseTs + plan.durationDays * 86400000);

  user.proExpiresAt = nextExpiry;
  await user.save({ transaction });

  return { plan, user, nextExpiry };
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
    const { plan, user, nextExpiry } = await extendProMembership({
      userId: req.user.id,
      planCode: body.plan,
      transaction: t,
    });

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

async function createProRazorpayOrder(req, res, next) {
  try {
    if (!isRazorpayConfigured()) {
      throw new HttpError(503, 'Razorpay is not configured on the server');
    }

    const body = createProOrderSchema.parse(req.body);
    const plan = PLANS[body.plan];
    if (!plan) throw new HttpError(400, 'Invalid plan');

    const normalizedEmail = assertRegisteredEmail(req, body.email);

    const receipt = buildProReceiptNumber({ planCode: plan.code, userId: req.user.id });
    const order = await createCheckoutOrder({
      amount: plan.amountRs,
      receipt,
      notes: {
        userId: String(req.user.id),
        email: normalizedEmail,
        purchaseType: 'pro_membership',
        plan: plan.code,
      },
    });

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
        description: `Movix Pro ${plan.label} membership`,
        amount: plan.amountRs,
        email: normalizedEmail,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function verifyProRazorpayPayment(req, res, next) {
  const t = await db.sequelize.transaction();
  try {
    if (!isRazorpayConfigured()) {
      throw new HttpError(503, 'Razorpay is not configured on the server');
    }

    const body = verifyProOrderSchema.parse(req.body);
    const plan = PLANS[body.plan];
    if (!plan) throw new HttpError(400, 'Invalid plan');

    const normalizedEmail = assertRegisteredEmail(req, body.email);

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

    const expectedAmount = toRazorpayAmount(plan.amountRs);
    if (Number(razorpayOrder.amount) !== expectedAmount || Number(razorpayPayment.amount) !== expectedAmount) {
      throw new HttpError(400, 'Razorpay amount does not match membership total');
    }
    if (String(razorpayOrder.currency || '').toUpperCase() !== 'INR') {
      throw new HttpError(400, 'Unsupported Razorpay currency');
    }

    const notes = razorpayOrder.notes || {};
    if (
      String(notes.userId || '') !== String(req.user.id) ||
      String(notes.email || '').trim().toLowerCase() !== normalizedEmail ||
      String(notes.purchaseType || '') !== 'pro_membership' ||
      String(notes.plan || '') !== plan.code
    ) {
      throw new HttpError(400, 'Razorpay order details do not match this membership purchase');
    }

    const existingPurchase = await db.ProMembershipPurchase.findOne({
      where: { paymentId: body.razorpayPaymentId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existingPurchase) {
      const user = await db.User.findByPk(req.user.id, { transaction: t });
      await t.commit();
      return res.json({
        ok: true,
        message: `Movix Pro ${plan.label} is already active for this payment.`,
        plan,
        payment: {
          orderId: body.razorpayOrderId,
          paymentId: body.razorpayPaymentId,
          status: String(razorpayPayment.status || 'captured').toLowerCase(),
        },
        subscription: {
          isProActive: true,
          proExpiresAt: user?.proExpiresAt || null,
          proDaysLeft: getDaysLeft(user?.proExpiresAt),
        },
        user: user ? toUserPayload(user) : null,
      });
    }

    const { user, nextExpiry } = await extendProMembership({
      userId: req.user.id,
      planCode: plan.code,
      transaction: t,
    });

    await db.ProMembershipPurchase.create(
      {
        userId: req.user.id,
        planCode: plan.code,
        amountRs: plan.amountRs,
        currency: String(razorpayOrder.currency || 'INR').toUpperCase(),
        paymentOrderId: body.razorpayOrderId,
        paymentId: body.razorpayPaymentId,
        paymentStatus: String(razorpayPayment.status || 'captured').toLowerCase(),
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      ok: true,
      message: `Movix Pro ${plan.label} activated successfully.`,
      plan,
      payment: {
        orderId: body.razorpayOrderId,
        paymentId: body.razorpayPaymentId,
        status: String(razorpayPayment.status || 'captured').toLowerCase(),
      },
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

module.exports = {
  getProDashboard,
  activatePro,
  createProRazorpayOrder,
  verifyProRazorpayPayment,
  PLANS,
  getDaysLeft,
};
