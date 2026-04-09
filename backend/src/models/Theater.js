const { DataTypes } = require('sequelize');

function defineTheater(sequelize) {
  const Theater = sequelize.define(
    'Theater',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      ownerUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(160), allowNull: false },
      address: { type: DataTypes.STRING(255), allowNull: false },
      city: { type: DataTypes.STRING(120), allowNull: false },
      isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'theaters', underscored: true }
  );

  return Theater;
}

module.exports = { defineTheater };
