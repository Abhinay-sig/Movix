jest.mock('../config/env', () => ({
  env: {
    seatHoldMs: 1000,
    auth: {
      paymentAbandonLockoutMs: 300000,
    },
  },
}));

const { HttpError } = require('./httpError');
const {
  ensureUserIsNotLocked,
  markPaymentCheckoutStarted,
  registerAbandonedPaymentIfNeeded,
  resetTemporaryLockState,
} = require('./appLockout');

function createUser(overrides = {}) {
  return {
    paymentAbandonCount: 0,
    paymentCheckoutStartedAt: null,
    appLockoutUntil: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('appLockout utils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-20T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('marks checkout as started', async () => {
    const user = createUser();

    await markPaymentCheckoutStarted(user);

    expect(user.paymentCheckoutStartedAt).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  test('increments abandoned count after an expired checkout window', async () => {
    const user = createUser({
      paymentCheckoutStartedAt: new Date('2026-04-19T23:59:58.000Z'),
    });

    await registerAbandonedPaymentIfNeeded(user);

    expect(user.paymentAbandonCount).toBe(1);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  test('locks the user on the fifth abandoned payment', async () => {
    const user = createUser({
      paymentAbandonCount: 4,
      paymentCheckoutStartedAt: new Date('2026-04-19T23:59:58.000Z'),
    });

    await expect(registerAbandonedPaymentIfNeeded(user)).rejects.toMatchObject({
      status: 403,
      message: 'Account temporarily locked due to repeated incomplete payments',
      details: expect.objectContaining({
        code: 'PAYMENT_ABANDON_LOCKED',
      }),
    });

    expect(user.appLockoutUntil).toBeInstanceOf(Date);
    expect(user.paymentCheckoutStartedAt).toBe(null);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  test('rejects requests while lockout is still active', async () => {
    const user = createUser({
      appLockoutUntil: new Date('2026-04-20T00:05:00.000Z'),
    });

    await expect(ensureUserIsNotLocked(user)).rejects.toBeInstanceOf(HttpError);
    await expect(ensureUserIsNotLocked(user)).rejects.toMatchObject({
      status: 403,
      details: expect.objectContaining({
        code: 'PAYMENT_ABANDON_LOCKED',
        retryAfterSeconds: 300,
      }),
    });
  });

  test('clears temporary state after the lockout expires', async () => {
    const user = createUser({
      paymentAbandonCount: 3,
      paymentCheckoutStartedAt: new Date('2026-04-19T23:00:00.000Z'),
      appLockoutUntil: new Date('2026-04-19T23:59:59.000Z'),
    });

    await ensureUserIsNotLocked(user);

    expect(user.paymentAbandonCount).toBe(0);
    expect(user.paymentCheckoutStartedAt).toBe(null);
    expect(user.appLockoutUntil).toBe(null);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  test('can manually reset temporary lock state', async () => {
    const user = createUser({
      paymentAbandonCount: 2,
      paymentCheckoutStartedAt: new Date('2026-04-19T23:00:00.000Z'),
      appLockoutUntil: new Date('2026-04-20T00:02:00.000Z'),
    });

    await resetTemporaryLockState(user);

    expect(user.paymentAbandonCount).toBe(0);
    expect(user.paymentCheckoutStartedAt).toBe(null);
    expect(user.appLockoutUntil).toBe(null);
    expect(user.save).toHaveBeenCalledTimes(1);
  });
});
