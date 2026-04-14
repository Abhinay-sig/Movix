const crypto = require('crypto');
const Razorpay = require('razorpay');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');

let razorpayClient = null;

function getCheckoutConfig() {
  return env.razorpay;
}

function getCheckoutDisplayName() {
  return env.razorpay.brandName || 'Movix';
}

function isRazorpayConfigured() {
  return Boolean(env.razorpay.keyId && env.razorpay.keySecret);
}

function getClient() {
  if (!isRazorpayConfigured()) {
    throw new HttpError(503, 'Razorpay is not configured on the server');
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }

  return razorpayClient;
}

function toRazorpayAmount(amount) {
  return Math.round(Number(amount || 0) * 100);
}

async function createCheckoutOrder({ amount, receipt, notes }) {
  return getClient().orders.create({
    amount: toRazorpayAmount(amount),
    currency: 'INR',
    receipt,
    notes,
  });
}

async function fetchOrder(orderId) {
  return getClient().orders.fetch(orderId);
}

async function fetchPayment(paymentId) {
  return getClient().payments.fetch(paymentId);
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const signatureBuffer = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new HttpError(400, 'Razorpay payment signature verification failed');
  }
}

module.exports = {
  createCheckoutOrder,
  fetchOrder,
  fetchPayment,
  getCheckoutConfig,
  getCheckoutDisplayName,
  isRazorpayConfigured,
  toRazorpayAmount,
  verifyPaymentSignature,
};
