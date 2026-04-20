const { env } = require('../config/env');
const { HttpError } = require('./httpError');

const PAYMENT_ABANDON_LIMIT = 5;

function getTimestampMs(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function buildLockoutDetails(user) {
  const lockedUntilMs = getTimestampMs(user?.appLockoutUntil);
  if (!lockedUntilMs || lockedUntilMs <= Date.now()) return null;

  return {
    lockedUntil: new Date(lockedUntilMs).toISOString(),
    retryAfterSeconds: Math.max(1, Math.ceil((lockedUntilMs - Date.now()) / 1000)),
  };
}

async function resetTemporaryLockState(user, transaction) {
  user.paymentAbandonCount = 0;
  user.paymentCheckoutStartedAt = null;
  user.appLockoutUntil = null;
  await user.save(transaction ? { transaction } : undefined);
}

async function ensureUserIsNotLocked(user, transaction) {
  if (!user) return;

  const lockout = buildLockoutDetails(user);
  if (lockout) {
    throw new HttpError(403, 'Account temporarily locked due to repeated incomplete payments', {
      code: 'PAYMENT_ABANDON_LOCKED',
      ...lockout,
    });
  }

  if (user.appLockoutUntil) {
    await resetTemporaryLockState(user, transaction);
  }
}

async function registerAbandonedPaymentIfNeeded(user, transaction) {
  await ensureUserIsNotLocked(user, transaction);

  const startedAtMs = getTimestampMs(user.paymentCheckoutStartedAt);
  const holdWindowMs = Number(env.seatHoldMs ?? 300000);
  const previousAttemptExpired = startedAtMs && startedAtMs + holdWindowMs <= Date.now();

  if (previousAttemptExpired) {
    user.paymentAbandonCount = Number(user.paymentAbandonCount || 0) + 1;

    if (user.paymentAbandonCount >= PAYMENT_ABANDON_LIMIT) {
      user.appLockoutUntil = new Date(Date.now() + Number(env.auth.paymentAbandonLockoutMs ?? 300000));
      user.paymentCheckoutStartedAt = null;
      await user.save(transaction ? { transaction } : undefined);
      throw new HttpError(403, 'Account temporarily locked due to repeated incomplete payments', {
        code: 'PAYMENT_ABANDON_LOCKED',
        ...buildLockoutDetails(user),
      });
    }

    await user.save(transaction ? { transaction } : undefined);
  }
}

async function markPaymentCheckoutStarted(user, transaction) {
  await ensureUserIsNotLocked(user, transaction);
  user.paymentCheckoutStartedAt = new Date();
  await user.save(transaction ? { transaction } : undefined);
}

module.exports = {
  ensureUserIsNotLocked,
  registerAbandonedPaymentIfNeeded,
  markPaymentCheckoutStarted,
  resetTemporaryLockState,
};
