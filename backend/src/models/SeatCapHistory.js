const { DataTypes } = require('sequelize');

function defineSeatCapHistory(sequelize) {
  const SeatCapHistory = sequelize.define(
    'SeatCapHistory',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      hallId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      seatType: { type: DataTypes.STRING(80), allowNull: false },
      oldCap: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      newCap: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      changedBy: { type: DataTypes.STRING(160), allowNull: false },
    },
    {
      tableName: 'seat_cap_history',
      underscored: true,
      indexes: [{ fields: ['hall_id', 'created_at'] }],
    }
  );

  return SeatCapHistory;
}

module.exports = { defineSeatCapHistory };

