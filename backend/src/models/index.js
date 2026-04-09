const { sequelize } = require('../db/sequelize');
const { defineUser, USER_ROLES, AUTH_PROVIDERS } = require('./User');
const { defineTheater } = require('./Theater');
const { defineHall } = require('./Hall');
const { defineHallLayout } = require('./HallLayout');
const { defineMovie } = require('./Movie');
const { defineOwnerMovie } = require('./OwnerMovie');
const { defineShow } = require('./Show');
const { defineSeatType, SEAT_TYPES } = require('./SeatType');
const { defineShowSeatPrice } = require('./ShowSeatPrice');
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
db.OwnerMovie = defineOwnerMovie(sequelize);
db.Show = defineShow(sequelize);

db.SeatType = defineSeatType(sequelize);
db.SEAT_TYPES = SEAT_TYPES;
db.ShowSeatPrice = defineShowSeatPrice(sequelize);

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

db.User.hasMany(db.OwnerMovie, { foreignKey: 'ownerUserId' });
db.OwnerMovie.belongsTo(db.User, { foreignKey: 'ownerUserId', as: 'owner' });
db.Movie.hasMany(db.OwnerMovie, { foreignKey: 'movieId' });
db.OwnerMovie.belongsTo(db.Movie, { foreignKey: 'movieId' });

db.Show.hasMany(db.ShowSeatPrice, { foreignKey: 'showId' });
db.ShowSeatPrice.belongsTo(db.Show, { foreignKey: 'showId' });
db.SeatType.hasMany(db.ShowSeatPrice, { foreignKey: 'seatTypeId' });
db.ShowSeatPrice.belongsTo(db.SeatType, { foreignKey: 'seatTypeId' });

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

async function syncDb() {
  await sequelize.sync();
  await db.User.sync({ alter: true });
  await seedSeatTypes();
}

module.exports = { db, syncDb };
