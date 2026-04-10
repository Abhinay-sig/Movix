const { DataTypes } = require('sequelize');

function defineMovie(sequelize) {
  const Movie = sequelize.define(
    'Movie',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(200), allowNull: false },
      genre: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'General' },
      releaseDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: '2000-01-01' },
      description: { type: DataTypes.TEXT, allowNull: true },
      durationMins: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 120 },
      posterUrl: { type: DataTypes.STRING(500), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'movies', underscored: true }
  );

  return Movie;
}

module.exports = { defineMovie };
