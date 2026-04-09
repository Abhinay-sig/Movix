const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const USER_ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
  OWNER: 'theater_owner',
});

const AUTH_PROVIDERS = Object.freeze({
  LOCAL: 'local',
  GOOGLE: 'google',
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
      authProvider: {
        type: DataTypes.ENUM(AUTH_PROVIDERS.LOCAL, AUTH_PROVIDERS.GOOGLE),
        allowNull: false,
        defaultValue: AUTH_PROVIDERS.LOCAL,
      },
      oauthSubject: { type: DataTypes.STRING(191), allowNull: true },
      emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
      verificationTokenHash: { type: DataTypes.STRING(128), allowNull: true },
      verificationTokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
      verificationLastSentAt: { type: DataTypes.DATE, allowNull: true },
      isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'users',
      underscored: true,
      indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['verification_token_hash'] },
        { fields: ['oauth_subject'] },
      ],
      defaultScope: {
        attributes: { exclude: ['passwordHash', 'verificationTokenHash', 'oauthSubject'] },
      },
      scopes: {
        withPassword: { attributes: { include: ['passwordHash'] } },
        withAuth: {
          attributes: {
            include: ['passwordHash', 'verificationTokenHash', 'oauthSubject'],
          },
        },
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

  User.prototype.isEmailVerified = function isEmailVerified() {
    return Boolean(this.emailVerifiedAt);
  };

  return User;
}

module.exports = { defineUser, USER_ROLES, AUTH_PROVIDERS };
