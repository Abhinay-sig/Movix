const { DataTypes } = require('sequelize');

function defineHall(sequelize) {
  const Hall = sequelize.define(
    'Hall',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      theaterId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      screenType: { type: DataTypes.STRING(40), allowNull: true },
      facilities: { type: DataTypes.JSON, allowNull: true },
      images: { type: DataTypes.JSON, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      rejectionReason: { type: DataTypes.TEXT, allowNull: true },

      isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      approvedAt: { type: DataTypes.DATE, allowNull: true },

      isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'halls', underscored: true }
  );

  return Hall;
}

module.exports = { defineHall };
