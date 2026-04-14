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
      passwordHash: { type: DataTypes.STRING(255), allowNull: true },
      hasUsablePassword: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
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
      passwordResetTokenHash: { type: DataTypes.STRING(128), allowNull: true },
      passwordResetTokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
      passwordResetLastSentAt: { type: DataTypes.DATE, allowNull: true },
      proExpiresAt: { type: DataTypes.DATE, allowNull: true },
      movixCoinsBalance: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      movixCoinsEarnedTotal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      movixCoinsRedeemedTotal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'users',
      underscored: true,
      indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['verification_token_hash'] },
        { fields: ['oauth_subject'] },
        { fields: ['password_reset_token_hash'] },
      ],
      defaultScope: {
        attributes: {
          exclude: ['passwordHash', 'verificationTokenHash', 'passwordResetTokenHash', 'oauthSubject'],
        },
      },
      scopes: {
        withPassword: { attributes: { include: ['passwordHash'] } },
        withAuth: {
          attributes: {
            include: [
              'passwordHash',
              'hasUsablePassword',
              'verificationTokenHash',
              'passwordResetTokenHash',
              'oauthSubject',
            ],
          },
        },
      },
    }
  );

  User.prototype.verifyPassword = async function verifyPassword(password) {
    if (!this.passwordHash || !this.hasUsablePassword) return false;
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
