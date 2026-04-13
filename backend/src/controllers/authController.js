const { z } = require('zod');
const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils/httpError');
const { db } = require('../models');
const { authService } = require('../services');

const signupSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
  role: z.enum([db.USER_ROLES.USER, db.USER_ROLES.OWNER]).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
});

const resendVerificationSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum([db.USER_ROLES.USER, db.USER_ROLES.OWNER]).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum([db.USER_ROLES.USER, db.USER_ROLES.OWNER]).optional(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
  role: z.enum([db.USER_ROLES.USER, db.USER_ROLES.OWNER]).optional(),
});

const verifyQuerySchema = z.object({
  token: z.string().min(1),
  role: z.enum([db.USER_ROLES.USER, db.USER_ROLES.OWNER]).optional(),
});

const googleStartSchema = z.object({
  role: z.enum([db.USER_ROLES.USER, db.USER_ROLES.OWNER]).default(db.USER_ROLES.USER),
});

const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

async function signup(req, res, next) {
  try {
    const body = signupSchema.parse(req.body);
    const result = await authService.signup(body);
    res.status(202).json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function login(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body);
    res.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function adminLogin(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.adminLogin(body);
    res.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function resendVerification(req, res, next) {
  try {
    const body = resendVerificationSchema.parse(req.body);
    const result = await authService.resendVerification(body);
    res.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const body = forgotPasswordSchema.parse(req.body);
    const result = await authService.requestPasswordReset(body);
    res.status(202).json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function resetPassword(req, res, next) {
  try {
    const body = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(body);
    res.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const query = verifyQuerySchema.parse(req.query);
    const result = await authService.verifyEmailToken(query.token, query.role);
    res.redirect(authService.buildVerificationRedirectUrl(result));
  } catch (e) {
    return next(e);
  }
}

async function googleStart(req, res, next) {
  try {
    const query = googleStartSchema.parse(req.query);
    const url = authService.buildGoogleStartUrl(query);
    res.redirect(url);
  } catch (e) {
    return next(e);
  }
}

function getRoleFromState(state) {
  try {
    return jwt.decode(state)?.role;
  } catch {
    return undefined;
  }
}

async function googleCallback(req, res) {
  try {
    const query = googleCallbackSchema.parse(req.query);
    const result = await authService.completeGoogleOAuth(query);
    res.redirect(result.redirectUrl);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Google OAuth callback failed:', e);
    const role = getRoleFromState(req.query.state) ?? db.USER_ROLES.USER;
    const message = e instanceof HttpError ? e.message : e?.message || 'Google sign-in failed';
    res.redirect(authService.getGoogleErrorRedirect(role, message));
  }
}

module.exports = {
  signup,
  login,
  adminLogin,
  resendVerification,
  forgotPassword,
  resetPassword,
  verifyEmail,
  googleStart,
  googleCallback,
};
