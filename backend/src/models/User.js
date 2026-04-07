const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const USER_ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
  OWNER: 'theater_owner',
});

function defineUser(sequelize) {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING(320), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      role: {
        type: DataTypes.ENUM(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.OWNER),
        allowNull: false,
        defaultValue: USER_ROLES.USER,
      },
      isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'users',
      underscored: true,
      indexes: [{ unique: true, fields: ['email'] }],
      defaultScope: { attributes: { exclude: ['passwordHash'] } },
      scopes: {
        withPassword: { attributes: { include: ['passwordHash'] } },
      },
    }
  );

  User.prototype.verifyPassword = async function verifyPassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  };

  User.hashPassword = async function hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  };

  return User;
}

module.exports = { defineUser, USER_ROLES };

