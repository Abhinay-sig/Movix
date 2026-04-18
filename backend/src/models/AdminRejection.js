const { DataTypes } = require('sequelize');

function defineAdminRejection(sequelize) {
  const AdminRejection = sequelize.define(
    'AdminRejection',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      entityType: { type: DataTypes.ENUM('theater', 'hall', 'show'), allowNull: false },
      entityId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      details: { type: DataTypes.JSON, allowNull: true },
      reason: { type: DataTypes.TEXT, allowNull: true },
      rejectedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'admin_rejections', underscored: true }
  );

  return AdminRejection;
}

module.exports = { defineAdminRejection };
