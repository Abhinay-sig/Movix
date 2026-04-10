const { DataTypes } = require('sequelize');

function defineMovieLanguage(sequelize) {
  const MovieLanguage = sequelize.define(
    'MovieLanguage',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      movieId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      language: { type: DataTypes.STRING(40), allowNull: false },
    },
    {
      tableName: 'movie_languages',
      underscored: true,
      indexes: [{ unique: true, fields: ['movie_id', 'language'] }],
    }
  );

  return MovieLanguage;
}

module.exports = { defineMovieLanguage };
