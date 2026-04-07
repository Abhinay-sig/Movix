const { DataTypes } = require('sequelize');

const BOOKING_STATUS = Object.freeze({
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
});

function defineBooking(sequelize) {
  const Booking = sequelize.define(
    'Booking',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      showId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      status: {
        type: DataTypes.ENUM(BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED),
        allowNull: false,
        defaultValue: BOOKING_STATUS.CONFIRMED,
      },
      totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    },
    { tableName: 'bookings', underscored: true, indexes: [{ fields: ['show_id', 'user_id'] }] }
  );

  return Booking;
}

module.exports = { defineBooking, BOOKING_STATUS };

