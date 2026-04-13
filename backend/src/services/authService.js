const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../models');
const { env } = require('../config/env');
const { signToken } = require('../utils/jwt');
const { HttpError } = require('../utils/httpError');
const { sendMail } = require('./mailService');

const GOOGLE_AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function randomToken(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function buildVerificationState(user) {
  const verificationSentAt = toIsoString(user.verificationLastSentAt);
  const verificationExpiresAt = toIsoString(user.verificationTokenExpiresAt);

  return {
    email: user.email,
    role: user.role,
    verificationSentAt,
    verificationExpiresAt,
    nextResendAt: verificationExpiresAt,
    retryAfterSeconds: getRetryAfterSeconds(user),
  };
}

function getRetryAfterSeconds(user) {
  const expiresAtMs = getTimestampMs(user.verificationTokenExpiresAt);
  if (!expiresAtMs) return 0;
  const diffMs = expiresAtMs - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
}

function userToJson(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isEmailVerified: Boolean(user.emailVerifiedAt),
    authProvider: user.authProvider,
  };
}

function isVerificationActive(user) {
  const expiresAtMs = getTimestampMs(user.verificationTokenExpiresAt);
  return Boolean(
    user.verificationTokenHash &&
      expiresAtMs &&
      expiresAtMs > Date.now()
  );
}

function getTimestampMs(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toIsoString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function createPasswordPlaceholder() {
  return db.User.hashPassword(randomToken(24));
}

async function persistPasswordResetToken(user) {
  const rawToken = randomToken(24);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.auth.passwordResetExpiresMs);

  user.passwordResetTokenHash = hashValue(rawToken);
  user.passwordResetTokenExpiresAt = expiresAt;
  user.passwordResetLastSentAt = now;
  await user.save();

  return { rawToken, expiresAt, sentAt: now };
}

async function persistVerificationToken(user) {
  const rawToken = randomToken(24);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.auth.verificationExpiresMs);

  user.verificationTokenHash = hashValue(rawToken);
  user.verificationTokenExpiresAt = expiresAt;
  user.verificationLastSentAt = now;
  await user.save();

  return { rawToken, expiresAt, sentAt: now };
}

function getAppUrlForRole(role) {
  return role === db.USER_ROLES.OWNER ? env.app.staffAppUrl : env.app.userAppUrl;
}

function getRoleLabel(role) {
  return role === db.USER_ROLES.OWNER ? 'Theater Owner' : 'User';
}

async function sendVerificationEmail(user, rawToken, expiresAt) {
  const verifyUrl =
    `${env.app.backendBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}` +
    `&role=${encodeURIComponent(user.role)}`;
  const roleLabel = getRoleLabel(user.role);
  const expiresInMinutes = Math.max(1, Math.round(env.auth.verificationExpiresMs / 60000));

  await sendMail({
    to: user.email,
    subject: 'Verify your Movix account',
    text: [
      `Hi ${user.name},`,
      '',
      `Please verify your ${roleLabel} account by visiting the link below:`,
      verifyUrl,
      '',
      `This link expires in ${expiresInMinutes} minute(s) and can only be used once.`,
      `If the link has already expired, sign up again or request a resend from Movix.`,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Verify your Movix account</h2>
        <p>Hi ${escapeHtml(user.name)},</p>
        <p>Please verify your ${escapeHtml(roleLabel)} account by clicking the button below.</p>
        <p style="margin: 24px 0;">
          <a
            href="${verifyUrl}"
            style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;display:inline-block;"
          >
            Verify email
          </a>
        </p>
        <p>This custom link expires at <strong>${expiresAt.toLocaleString()}</strong> and can only be used once.</p>
        <p>If it expires, head back to Movix and request a new verification link.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(user, rawToken, expiresAt) {
  const resetUrl = new URL('/reset-password', getAppUrlForRole(user.role));
  resetUrl.searchParams.set('token', rawToken);
  resetUrl.searchParams.set('role', user.role);

  const roleLabel = getRoleLabel(user.role);
  const expiresInMinutes = Math.max(1, Math.round(env.auth.passwordResetExpiresMs / 60000));

  await sendMail({
    to: user.email,
    subject: 'Reset your Movix password',
    text: [
      `Hi ${user.name},`,
      '',
      `We received a request to reset the password for your ${roleLabel} account.`,
      'Use the link below to choose a new password:',
      resetUrl.toString(),
      '',
      `This link expires in ${expiresInMinutes} minute(s) and can only be used once.`,
      'If you did not request this change, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Reset your Movix password</h2>
        <p>Hi ${escapeHtml(user.name)},</p>
        <p>We received a request to reset the password for your ${escapeHtml(roleLabel)} account.</p>
        <p style="margin: 24px 0;">
          <a
            href="${resetUrl.toString()}"
            style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;display:inline-block;"
          >
            Reset password
          </a>
        </p>
        <p>This link expires at <strong>${expiresAt.toLocaleString()}</strong> and can only be used once.</p>
        <p>If you did not request this change, you can safely ignore this email.</p>
      </div>
    `,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function issueVerification(user, message) {
  const { rawToken } = await persistVerificationToken(user);
  try {
    await sendVerificationEmail(user, rawToken, user.verificationTokenExpiresAt);
  } catch (error) {
    user.verificationTokenHash = null;
    user.verificationTokenExpiresAt = null;
    user.verificationLastSentAt = null;
    await user.save();
    throw error;
  }

  return {
    status: 'verification_pending',
    message,
    verification: buildVerificationState(user),
    user: userToJson(user),
  };
}

async function signup({ email, name, password, role }) {
  const normalizedEmail = normalizeEmail(email);
  const requestedRole = role ?? db.USER_ROLES.USER;
  const existingUser = await db.User.scope('withAuth').findOne({
    where: { email: normalizedEmail },
  });

  if (!existingUser) {
    const passwordHash = await db.User.hashPassword(password);
    const user = await db.User.create({
      email: normalizedEmail,
      name,
      passwordHash,
      role: requestedRole,
      authProvider: db.AUTH_PROVIDERS.LOCAL,
    });

    return issueVerification(user, 'Verification link sent to your email address.');
  }

  if (existingUser.emailVerifiedAt) {
    throw new HttpError(409, 'Email already in use');
  }

  if (isVerificationActive(existingUser)) {
    return {
      status: 'verification_pending',
      message: 'Verification link already sent. Please wait before requesting a new one.',
      verification: buildVerificationState(existingUser),
      user: userToJson(existingUser),
    };
  }

  existingUser.name = name;
  existingUser.role = requestedRole;
  existingUser.authProvider = db.AUTH_PROVIDERS.LOCAL;
  existingUser.oauthSubject = null;
  existingUser.passwordHash = await db.User.hashPassword(password);
  await existingUser.save();

  return issueVerification(existingUser, 'Previous link expired. A new verification link has been sent.');
}

async function resendVerification({ email, role }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await db.User.scope('withAuth').findOne({ where: { email: normalizedEmail } });

  if (!user) {
    throw new HttpError(404, 'No pending account found for this email');
  }

  if (user.emailVerifiedAt) {
    throw new HttpError(409, 'This account is already verified');
  }

  if (role && user.role !== role) {
    throw new HttpError(409, 'This email is registered for a different account type');
  }

  if (isVerificationActive(user)) {
    throw new HttpError(409, 'Verification link already sent', {
      code: 'VERIFICATION_ALREADY_SENT',
      verification: buildVerificationState(user),
      user: userToJson(user),
    });
  }

  return issueVerification(user, 'A new verification link has been sent.');
}

async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await db.User.scope('withAuth').findOne({ where: { email: normalizedEmail } });
  if (!user) throw new HttpError(401, 'Invalid credentials');
  if (user.isBlocked) throw new HttpError(403, 'User is blocked');

  if (!user.emailVerifiedAt) {
    throw new HttpError(403, 'Please verify your email before logging in', {
      code: 'EMAIL_NOT_VERIFIED',
      verification: buildVerificationState(user),
      user: userToJson(user),
    });
  }

  if (!user.hasUsablePassword || !user.passwordHash) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const ok = await user.verifyPassword(password);
  if (!ok) throw new HttpError(401, 'Invalid credentials');

  const token = signToken({ sub: user.id, role: user.role });
  return { token, user: userToJson(user) };
}

async function adminLogin({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (
    normalizedEmail !== env.admin.email.toLowerCase() ||
    password !== env.admin.password
  ) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const [admin] = await db.User.scope('withPassword').findOrCreate({
    where: { email: normalizedEmail },
    defaults: {
      email: normalizedEmail,
      name: 'Admin',
      role: db.USER_ROLES.ADMIN,
      passwordHash: await db.User.hashPassword(env.admin.password),
      hasUsablePassword: true,
      emailVerifiedAt: new Date(),
    },
  });

  if (!admin.emailVerifiedAt) {
    admin.emailVerifiedAt = new Date();
  }

  if (!admin.hasUsablePassword) {
    admin.hasUsablePassword = true;
  }

  if (admin.changed()) {
    await admin.save();
  }

  const token = signToken({ sub: admin.id, role: admin.role });
  return { token, user: userToJson(admin) };
}

async function verifyEmailToken(rawToken, fallbackRole = db.USER_ROLES.USER) {
  const tokenHash = hashValue(rawToken);
  const user = await db.User.scope('withAuth').findOne({
    where: { verificationTokenHash: tokenHash },
  });

  if (!user) {
    return { ok: false, reason: 'expired', role: fallbackRole };
  }

  if (user.emailVerifiedAt) {
    user.verificationTokenHash = null;
    user.verificationTokenExpiresAt = null;
    await user.save();
    return { ok: false, reason: 'expired', role: user.role };
  }

  const expiresAtMs = getTimestampMs(user.verificationTokenExpiresAt);
  if (!expiresAtMs || expiresAtMs <= Date.now()) {
    user.verificationTokenHash = null;
    user.verificationTokenExpiresAt = null;
    await user.save();
    return { ok: false, reason: 'expired', role: user.role };
  }

  user.emailVerifiedAt = new Date();
  user.verificationTokenHash = null;
  user.verificationTokenExpiresAt = null;
  await user.save();

  return { ok: true, role: user.role };
}

async function requestPasswordReset({ email, role }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await db.User.scope('withAuth').findOne({ where: { email: normalizedEmail } });
  const message = 'A password reset link has been sent to this email.';

  if (!user) {
    return { message };
  }

  if (role && user.role !== role) {
    return { message };
  }

  if (user.role === db.USER_ROLES.ADMIN || user.isBlocked || !user.emailVerifiedAt) {
    return { message };
  }

  const { rawToken, expiresAt } = await persistPasswordResetToken(user);

  try {
    await sendPasswordResetEmail(user, rawToken, expiresAt);
  } catch (error) {
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;
    user.passwordResetLastSentAt = null;
    await user.save();
    throw error;
  }

  return { message };
}

async function resetPassword({ token, password, role }) {
  const tokenHash = hashValue(token);
  const user = await db.User.scope('withAuth').findOne({
    where: { passwordResetTokenHash: tokenHash },
  });

  if (!user) {
    throw new HttpError(400, 'Password reset link is invalid or expired');
  }

  if (role && user.role !== role) {
    throw new HttpError(400, 'Password reset link is invalid or expired');
  }

  if (user.role === db.USER_ROLES.ADMIN) {
    throw new HttpError(400, 'Password reset link is invalid or expired');
  }

  if (user.isBlocked) {
    throw new HttpError(403, 'User is blocked');
  }

  const expiresAtMs = getTimestampMs(user.passwordResetTokenExpiresAt);
  if (!expiresAtMs || expiresAtMs <= Date.now()) {
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;
    user.passwordResetLastSentAt = null;
    await user.save();
    throw new HttpError(400, 'Password reset link is invalid or expired');
  }

  user.passwordHash = await db.User.hashPassword(password);
  user.hasUsablePassword = true;
  user.passwordResetTokenHash = null;
  user.passwordResetTokenExpiresAt = null;
  user.passwordResetLastSentAt = null;
  await user.save();

  return {
    message: 'Password updated successfully. You can now sign in with your password.',
    user: userToJson(user),
  };
}

function buildVerificationRedirectUrl(result) {
  const appUrl = getAppUrlForRole(result.role);
  const target = new URL('/verify-email', appUrl);
  target.searchParams.set('status', result.ok ? 'success' : 'expired');
  return target.toString();
}

function assertGoogleConfigured() {
  if (!env.oauth.googleClientId || !env.oauth.googleClientSecret || !env.oauth.googleRedirectUri) {
    throw new HttpError(500, 'Google OAuth is not configured');
  }
}

function signGoogleState(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '10m' });
}

function verifyGoogleState(state) {
  return jwt.verify(state, env.jwt.secret);
}

function getGoogleErrorRedirect(role, message) {
  const appUrl = getAppUrlForRole(role);
  const target = new URL('/login', appUrl);
  target.searchParams.set('oauthError', message);
  return target.toString();
}

function buildGoogleStartUrl({ role }) {
  assertGoogleConfigured();
  const state = signGoogleState({ role });
  const url = new URL(GOOGLE_AUTH_BASE_URL);

  url.searchParams.set('client_id', env.oauth.googleClientId);
  url.searchParams.set('redirect_uri', env.oauth.googleRedirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', state);

  return url.toString();
}

async function fetchGoogleTokens(code) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.oauth.googleClientId,
      client_secret: env.oauth.googleClientSecret,
      redirect_uri: env.oauth.googleRedirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(502, 'Google token exchange failed', { body });
  }

  return response.json();
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(502, 'Google profile lookup failed', { body });
  }

  return response.json();
}

async function upsertGoogleUser({ role, profile }) {
  const email = normalizeEmail(profile.email);
  const existingUser = await db.User.scope('withAuth').findOne({ where: { email } });

  if (!existingUser) {
    return db.User.create({
      email,
      name: profile.name || email.split('@')[0],
      passwordHash: await createPasswordPlaceholder(),
      hasUsablePassword: false,
      role,
      authProvider: db.AUTH_PROVIDERS.GOOGLE,
      oauthSubject: profile.sub,
      emailVerifiedAt: new Date(),
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
      verificationLastSentAt: null,
    });
  }

  if (existingUser.role !== role) {
    throw new HttpError(
      409,
      role === db.USER_ROLES.OWNER
        ? 'This email belongs in the guest booking experience.'
        : 'This account is managed through our partner workspace.'
    );
  }

  if (existingUser.isBlocked) {
    throw new HttpError(403, 'User is blocked');
  }

  if (
    existingUser.authProvider === db.AUTH_PROVIDERS.GOOGLE &&
    existingUser.oauthSubject &&
    existingUser.oauthSubject !== profile.sub
  ) {
    throw new HttpError(409, 'Google account mismatch');
  }

  existingUser.name = existingUser.name || profile.name || email.split('@')[0];
  existingUser.oauthSubject = profile.sub;
  existingUser.emailVerifiedAt = new Date();
  existingUser.verificationTokenHash = null;
  existingUser.verificationTokenExpiresAt = null;
  await existingUser.save();

  return existingUser;
}

function buildOAuthSuccessRedirect({ role, token, user }) {
  const target = new URL('/oauth/callback', getAppUrlForRole(role));
  target.hash = new URLSearchParams({
    token,
    user: JSON.stringify(user),
  }).toString();
  return target.toString();
}

async function completeGoogleOAuth({ code, state }) {
  assertGoogleConfigured();

  let payload;
  try {
    payload = verifyGoogleState(state);
  } catch {
    throw new HttpError(400, 'Invalid OAuth state');
  }

  const tokenResponse = await fetchGoogleTokens(code);
  const profile = await fetchGoogleProfile(tokenResponse.access_token);

  if (!profile.email || !profile.email_verified) {
    throw new HttpError(400, 'Google account email is not verified');
  }

  const user = await upsertGoogleUser({ role: payload.role, profile });
  const token = signToken({ sub: user.id, role: user.role });

  return {
    redirectUrl: buildOAuthSuccessRedirect({
      role: payload.role,
      token,
      user: userToJson(user),
    }),
    role: payload.role,
  };
}

module.exports = {
  signup,
  resendVerification,
  login,
  adminLogin,
  requestPasswordReset,
  resetPassword,
  verifyEmailToken,
  buildVerificationRedirectUrl,
  buildGoogleStartUrl,
  completeGoogleOAuth,
  getGoogleErrorRedirect,
};
