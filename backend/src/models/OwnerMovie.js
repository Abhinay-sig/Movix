const { DataTypes } = require('sequelize');

function defineOwnerMovie(sequelize) {
  const OwnerMovie = sequelize.define(
    'OwnerMovie',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      ownerUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      movieId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    },
    {
      tableName: 'owner_movies',
      underscored: true,
      indexes: [{ unique: true, fields: ['owner_user_id', 'movie_id'] }],
    }
  );

  return OwnerMovie;
}

module.exports = { defineOwnerMovie };
