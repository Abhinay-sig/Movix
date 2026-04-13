const { DataTypes } = require('sequelize');

const MOVIX_COIN_TX_TYPES = Object.freeze({
  CASHBACK_CREDIT: 'cashback_credit',
  BOOKING_DEBIT: 'booking_debit',
});

function defineMovixCoinTransaction(sequelize) {
  const MovixCoinTransaction = sequelize.define(
    'MovixCoinTransaction',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      bookingId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      type: {
        type: DataTypes.ENUM(MOVIX_COIN_TX_TYPES.CASHBACK_CREDIT, MOVIX_COIN_TX_TYPES.BOOKING_DEBIT),
        allowNull: false,
      },
      coins: { type: DataTypes.INTEGER, allowNull: false },
      note: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'movix_coin_transactions',
      underscored: true,
      indexes: [
        { fields: ['user_id', 'created_at'] },
        { fields: ['booking_id'] },
      ],
    }
  );

  return MovixCoinTransaction;
}

module.exports = { defineMovixCoinTransaction, MOVIX_COIN_TX_TYPES };
