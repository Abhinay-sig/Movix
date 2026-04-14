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
      customerEmail: { type: DataTypes.STRING(320), allowNull: true },
      receiptNumber: { type: DataTypes.STRING(80), allowNull: true },
      paymentProvider: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'razorpay' },
      paymentStatus: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'captured' },
      paymentMethod: { type: DataTypes.STRING(64), allowNull: true },
      paymentOrderId: { type: DataTypes.STRING(128), allowNull: true },
      paymentId: { type: DataTypes.STRING(128), allowNull: true },
      paymentSignature: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'bookings',
      underscored: true,
      indexes: [{ fields: ['show_id', 'user_id'] }],
    }
  );

  return Booking;
}

module.exports = { defineBooking, BOOKING_STATUS };
