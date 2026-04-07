const { DataTypes } = require('sequelize');

function defineShowSeatPrice(sequelize) {
  const ShowSeatPrice = sequelize.define(
    'ShowSeatPrice',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      showId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      seatTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    },
    {
      tableName: 'show_seat_prices',
      underscored: true,
      indexes: [{ unique: true, fields: ['show_id', 'seat_type_id'] }],
    }
  );

  return ShowSeatPrice;
}

module.exports = { defineShowSeatPrice };

