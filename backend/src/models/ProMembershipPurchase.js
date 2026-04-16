const { DataTypes } = require('sequelize');

const PRO_PLAN_CODES = Object.freeze({
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
});

function defineProMembershipPurchase(sequelize) {
  const ProMembershipPurchase = sequelize.define(
    'ProMembershipPurchase',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      planCode: {
        type: DataTypes.ENUM(PRO_PLAN_CODES.MONTHLY, PRO_PLAN_CODES.YEARLY),
        allowNull: false,
      },
      amountRs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      currency: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'INR' },
      paymentOrderId: { type: DataTypes.STRING(128), allowNull: false },
      paymentId: { type: DataTypes.STRING(128), allowNull: false },
      paymentStatus: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'captured' },
    },
    {
      tableName: 'pro_membership_purchases',
      underscored: true,
      indexes: [
        { fields: ['user_id', 'created_at'] },
        { fields: ['payment_order_id'], unique: true },
        { fields: ['payment_id'], unique: true },
      ],
    }
  );

  return ProMembershipPurchase;
}

module.exports = { defineProMembershipPurchase, PRO_PLAN_CODES };
