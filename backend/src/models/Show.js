const { DataTypes } = require('sequelize');

function defineShow(sequelize) {
  const Show = sequelize.define(
    'Show',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      hallId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      movieId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

      startsAt: { type: DataTypes.DATE, allowNull: false },
      endsAt: { type: DataTypes.DATE, allowNull: false },

      language: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'English' },

      isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      approvedAt: { type: DataTypes.DATE, allowNull: true },

      isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isCancelled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      cancelledAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'shows',
      underscored: true,
      indexes: [
        { fields: ['hall_id', 'starts_at'] },
        { fields: ['movie_id', 'starts_at'] },
      ],
    }
  );

  return Show;
}

module.exports = { defineShow };

