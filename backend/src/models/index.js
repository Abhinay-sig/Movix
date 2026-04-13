const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/sequelize');
const { defineUser, USER_ROLES, AUTH_PROVIDERS } = require('./User');
const { defineTheater } = require('./Theater');
const { defineHall } = require('./Hall');
const { defineHallLayout } = require('./HallLayout');
const { defineMovie } = require('./Movie');
const { defineMovieLanguage } = require('./MovieLanguage');
const { defineOwnerMovie } = require('./OwnerMovie');
const { defineShow } = require('./Show');
const { defineSeatType, SEAT_TYPES } = require('./SeatType');
const { defineShowSeatPrice } = require('./ShowSeatPrice');
const { defineHallSeatCap } = require('./HallSeatCap');
const { defineSeatCapHistory } = require('./SeatCapHistory');
const { defineSeatHold, HOLD_STATUS } = require('./SeatHold');
const { defineBooking, BOOKING_STATUS } = require('./Booking');
const { defineBookingSeat } = require('./BookingSeat');

const db = {};

db.sequelize = sequelize;

db.User = defineUser(sequelize);
db.USER_ROLES = USER_ROLES;
db.AUTH_PROVIDERS = AUTH_PROVIDERS;

db.Theater = defineTheater(sequelize);
db.Hall = defineHall(sequelize);
db.HallLayout = defineHallLayout(sequelize);

db.Movie = defineMovie(sequelize);
db.MovieLanguage = defineMovieLanguage(sequelize);
db.OwnerMovie = defineOwnerMovie(sequelize);
db.Show = defineShow(sequelize);

db.SeatType = defineSeatType(sequelize);
db.SEAT_TYPES = SEAT_TYPES;
db.ShowSeatPrice = defineShowSeatPrice(sequelize);
db.HallSeatCap = defineHallSeatCap(sequelize);
db.SeatCapHistory = defineSeatCapHistory(sequelize);

db.SeatHold = defineSeatHold(sequelize);
db.HOLD_STATUS = HOLD_STATUS;

db.Booking = defineBooking(sequelize);
db.BOOKING_STATUS = BOOKING_STATUS;
db.BookingSeat = defineBookingSeat(sequelize);

// Associations
db.User.hasMany(db.Theater, { foreignKey: 'ownerUserId' });
db.Theater.belongsTo(db.User, { foreignKey: 'ownerUserId', as: 'owner' });

db.Theater.hasMany(db.Hall, { foreignKey: 'theaterId' });
db.Hall.belongsTo(db.Theater, { foreignKey: 'theaterId' });

db.Hall.hasOne(db.HallLayout, { foreignKey: 'hallId' });
db.HallLayout.belongsTo(db.Hall, { foreignKey: 'hallId' });

db.Hall.hasMany(db.Show, { foreignKey: 'hallId' });
db.Show.belongsTo(db.Hall, { foreignKey: 'hallId' });


db.Movie.hasMany(db.Show, { foreignKey: 'movieId' });
db.Show.belongsTo(db.Movie, { foreignKey: 'movieId' });
db.Movie.hasMany(db.MovieLanguage, { foreignKey: 'movieId' });
db.MovieLanguage.belongsTo(db.Movie, { foreignKey: 'movieId' });

db.User.hasMany(db.OwnerMovie, { foreignKey: 'ownerUserId' });
db.OwnerMovie.belongsTo(db.User, { foreignKey: 'ownerUserId', as: 'owner' });
db.Movie.hasMany(db.OwnerMovie, { foreignKey: 'movieId' });
db.OwnerMovie.belongsTo(db.Movie, { foreignKey: 'movieId' });

db.Show.hasMany(db.ShowSeatPrice, { foreignKey: 'showId' });
db.ShowSeatPrice.belongsTo(db.Show, { foreignKey: 'showId' });
db.SeatType.hasMany(db.ShowSeatPrice, { foreignKey: 'seatTypeId' });
db.ShowSeatPrice.belongsTo(db.SeatType, { foreignKey: 'seatTypeId' });

db.Hall.hasMany(db.HallSeatCap, { foreignKey: 'hallId' });
db.HallSeatCap.belongsTo(db.Hall, { foreignKey: 'hallId' });
db.SeatType.hasMany(db.HallSeatCap, { foreignKey: 'seatTypeId' });
db.HallSeatCap.belongsTo(db.SeatType, { foreignKey: 'seatTypeId' });

db.Hall.hasMany(db.SeatCapHistory, { foreignKey: 'hallId' });
db.SeatCapHistory.belongsTo(db.Hall, { foreignKey: 'hallId' });

db.Show.hasMany(db.SeatHold, { foreignKey: 'showId' });
db.SeatHold.belongsTo(db.Show, { foreignKey: 'showId' });
db.User.hasMany(db.SeatHold, { foreignKey: 'userId' });
db.SeatHold.belongsTo(db.User, { foreignKey: 'userId' });

db.Show.hasMany(db.Booking, { foreignKey: 'showId' });
db.Booking.belongsTo(db.Show, { foreignKey: 'showId' });
db.User.hasMany(db.Booking, { foreignKey: 'userId' });
db.Booking.belongsTo(db.User, { foreignKey: 'userId' });

db.Booking.hasMany(db.BookingSeat, { foreignKey: 'bookingId' });
db.BookingSeat.belongsTo(db.Booking, { foreignKey: 'bookingId' });
db.Show.hasMany(db.BookingSeat, { foreignKey: 'showId' });
db.BookingSeat.belongsTo(db.Show, { foreignKey: 'showId' });
db.SeatType.hasMany(db.BookingSeat, { foreignKey: 'seatTypeId' });
db.BookingSeat.belongsTo(db.SeatType, { foreignKey: 'seatTypeId' });

async function seedSeatTypes() {
  const defaults = [
    { code: db.SEAT_TYPES.STANDARD, displayName: 'Standard', adminPriceCap: 200 },
    { code: db.SEAT_TYPES.PREMIUM, displayName: 'Premium', adminPriceCap: 350 },
    { code: db.SEAT_TYPES.RECLINER, displayName: 'Recliner', adminPriceCap: 600 },
    { code: db.SEAT_TYPES.VIP, displayName: 'VIP', adminPriceCap: 900 },
  ];

  for (const st of defaults) {
    // eslint-disable-next-line no-await-in-loop
    await db.SeatType.findOrCreate({ where: { code: st.code }, defaults: st });
  }
}

async function ensureMovieSchema() {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('movies');

  if (!table.genre) {
    await queryInterface.addColumn('movies', 'genre', {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: 'General',
    });
  }

  if (!table.release_date) {
    await queryInterface.addColumn('movies', 'release_date', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!table.description) {
    await queryInterface.addColumn('movies', 'description', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }

  if (!table.duration_mins) {
    await queryInterface.addColumn('movies', 'duration_mins', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 120,
    });
  }

  if (!table.poster_url) {
    await queryInterface.addColumn('movies', 'poster_url', {
      type: DataTypes.STRING(500),
      allowNull: true,
    });
  }

  if (!table.is_active) {
    await queryInterface.addColumn('movies', 'is_active', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  }
}

async function ensureUserSchema() {
  const queryInterface = sequelize.getQueryInterface();

  let table;
  try {
    table = await queryInterface.describeTable('users');
  } catch (error) {
    return;
  }

  if (!table.auth_provider) {
    await queryInterface.addColumn('users', 'auth_provider', {
      type: DataTypes.ENUM(db.AUTH_PROVIDERS.LOCAL, db.AUTH_PROVIDERS.GOOGLE),
      allowNull: false,
      defaultValue: db.AUTH_PROVIDERS.LOCAL,
    });
  }

  if (!table.oauth_subject) {
    await queryInterface.addColumn('users', 'oauth_subject', {
      type: DataTypes.STRING(191),
      allowNull: true,
    });
  }

  if (!table.email_verified_at) {
    await queryInterface.addColumn('users', 'email_verified_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }

  if (!table.verification_token_hash) {
    await queryInterface.addColumn('users', 'verification_token_hash', {
      type: DataTypes.STRING(128),
      allowNull: true,
    });
  }

  if (!table.verification_token_expires_at) {
    await queryInterface.addColumn('users', 'verification_token_expires_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }

  if (!table.verification_last_sent_at) {
    await queryInterface.addColumn('users', 'verification_last_sent_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }

  if (!table.is_blocked) {
    await queryInterface.addColumn('users', 'is_blocked', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }

  const indexes = await queryInterface.showIndex('users');
  const indexNames = new Set(indexes.map((index) => index.name));

  if (!indexNames.has('users_verification_token_hash')) {
    await queryInterface.addIndex('users', ['verification_token_hash'], {
      name: 'users_verification_token_hash',
    });
  }

  if (!indexNames.has('users_oauth_subject')) {
    await queryInterface.addIndex('users', ['oauth_subject'], {
      name: 'users_oauth_subject',
    });
  }
}

async function ensureSeatHoldSchema() {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('seat_holds');

  if (!table.session_token) {
    await queryInterface.addColumn('seat_holds', 'session_token', {
      type: DataTypes.STRING(96),
      allowNull: true,
    });
  }
}

async function ensureApprovalStatusSchema() {
  const queryInterface = sequelize.getQueryInterface();

  const halls = await queryInterface.describeTable('halls');
  if (!halls.status) {
    await queryInterface.addColumn('halls', 'status', {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    });
  }
  if (!halls.rejection_reason) {
    await queryInterface.addColumn('halls', 'rejection_reason', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  await sequelize.query("UPDATE halls SET status = CASE WHEN is_approved = 1 THEN 'approved' ELSE COALESCE(status, 'pending') END");

  const shows = await queryInterface.describeTable('shows');
  if (!shows.status) {
    await queryInterface.addColumn('shows', 'status', {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    });
  }
  if (!shows.rejection_reason) {
    await queryInterface.addColumn('shows', 'rejection_reason', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  await sequelize.query("UPDATE shows SET status = CASE WHEN is_approved = 1 THEN 'approved' ELSE COALESCE(status, 'pending') END");
}

async function syncDb() {
  await ensureUserSchema();
  // Avoid repeated ALTER-based index churn (can hit MySQL max-keys limit on long-lived DBs).
  // Schema evolution is handled by explicit ensure* functions below.
  await sequelize.sync();
  await ensureMovieSchema();
  await ensureSeatHoldSchema();
  await ensureApprovalStatusSchema();
  await seedSeatTypes();
}

module.exports = { db, syncDb };
