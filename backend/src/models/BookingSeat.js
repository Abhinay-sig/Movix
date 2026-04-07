const { DataTypes } = require('sequelize');

function defineBookingSeat(sequelize) {
  const BookingSeat = sequelize.define(
    'BookingSeat',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      bookingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      showId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      seatCode: { type: DataTypes.STRING(16), allowNull: false },
      seatTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'booking_seats',
      underscored: true,
      indexes: [{ unique: true, fields: ['show_id', 'seat_code'] }],
    }
  );

  return BookingSeat;
}

module.exports = { defineBookingSeat };

