const { DataTypes } = require('sequelize');

const HOLD_STATUS = Object.freeze({
  HELD: 'held',
  RELEASED: 'released',
});

function defineSeatHold(sequelize) {
  const SeatHold = sequelize.define(
    'SeatHold',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      showId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      seatCode: { type: DataTypes.STRING(16), allowNull: false }, // e.g. A1, AX80
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      status: {
        type: DataTypes.ENUM(HOLD_STATUS.HELD, HOLD_STATUS.RELEASED),
        allowNull: false,
        defaultValue: HOLD_STATUS.HELD,
      },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      tableName: 'seat_holds',
      underscored: true,
      indexes: [
        { unique: true, fields: ['show_id', 'seat_code'] },
        { fields: ['show_id', 'expires_at'] },
      ],
    }
  );

  return SeatHold;
}

module.exports = { defineSeatHold, HOLD_STATUS };

