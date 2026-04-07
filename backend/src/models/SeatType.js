const { DataTypes } = require('sequelize');

const SEAT_TYPES = Object.freeze({
  STANDARD: 'standard',
  PREMIUM: 'premium',
  RECLINER: 'recliner',
  VIP: 'vip',
});

function defineSeatType(sequelize) {
  const SeatType = sequelize.define(
    'SeatType',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      code: {
        type: DataTypes.ENUM(
          SEAT_TYPES.STANDARD,
          SEAT_TYPES.PREMIUM,
          SEAT_TYPES.RECLINER,
          SEAT_TYPES.VIP
        ),
        allowNull: false,
        unique: true,
      },
      displayName: { type: DataTypes.STRING(80), allowNull: false },
      adminPriceCap: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'seat_types', underscored: true }
  );

  return SeatType;
}

module.exports = { defineSeatType, SEAT_TYPES };

