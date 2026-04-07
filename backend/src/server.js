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
const { errorHandler } = require('./middleware/errorHandler');
const { cleanupExpiredHolds } = require('./controllers/holdController');

const app = express();

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
app.use('/api', holdRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

async function start() {
  await sequelize.authenticate();
  await syncDb();
  await seedDatabase();

  setInterval(() => {
    cleanupExpiredHolds().catch(() => {});
  }, 60_000);

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on :${env.port}`);
  });
}

start().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

