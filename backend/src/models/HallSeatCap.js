const { DataTypes } = require('sequelize');

function defineHallSeatCap(sequelize) {
  const HallSeatCap = sequelize.define(
    'HallSeatCap',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      hallId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      seatTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      priceCap: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    },
    {
      tableName: 'hall_seat_caps',
      underscored: true,
      indexes: [{ unique: true, fields: ['hall_id', 'seat_type_id'] }],
    }
  );

  return HallSeatCap;
}

module.exports = { defineHallSeatCap };

