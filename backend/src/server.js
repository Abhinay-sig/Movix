const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { sequelize } = require('./db/sequelize');
const { syncDb } = require('./models');
const { seedDatabase } = require('./seeders/seeder');
const { authRoutes } = require('./routes/authRoutes');
const { holdRoutes } = require('./routes/holdRoutes');
const { ownerRoutes } = require('./routes/ownerRoutes');
const { adminRoutes } = require('./routes/adminRoutes');
const { publicRoutes } = require('./routes/publicRoutes');
const { proRoutes } = require('./routes/proRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { requireAuth, requireRole } = require('./middleware/auth');
const { db } = require('./models');
const { initSeatAvailabilityRealtime, emitSeatAvailabilityChanged } = require('./realtime/seatAvailability');
const {
  cleanupExpiredHolds,
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require('./controllers/holdController');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res, next) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }

});

app.use('/api/auth', authRoutes);
app.post(
  '/api/payments/razorpay/order',
  requireAuth,
  requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN),
  createRazorpayOrder
);
app.post(
  '/api/payments/razorpay/verify',
  requireAuth,
  requireRole(db.USER_ROLES.USER, db.USER_ROLES.ADMIN),
  verifyRazorpayPayment
);
app.use('/api', holdRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', proRoutes);

app.use(errorHandler);

initSeatAvailabilityRealtime(server);

async function start() {
  await sequelize.authenticate();
  await syncDb();
  // await seedDatabase();

  setInterval(() => {
    cleanupExpiredHolds()
      .then((releasedShowIds) => {
        releasedShowIds.forEach((showId) => {
          emitSeatAvailabilityChanged(showId, { reason: 'hold_expired' });
        });
      })
      .catch(() => {});
  }, 60_000);

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on :${env.port}`);
  });
}

start().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

//abhi
