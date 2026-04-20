const { HttpError } = require('../utils/httpError');
const { verifyToken } = require('../utils/jwt');
const { db } = require('../models');
const { ensureUserIsNotLocked } = require('../utils/appLockout');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Missing Bearer token');

    const decoded = verifyToken(token);
    const user = await db.User.scope('withPassword').findByPk(decoded.sub);
    if (!user) throw new HttpError(401, 'Invalid token');
    if (user.isBlocked) throw new HttpError(403, 'User is blocked');
    if (user.role === db.USER_ROLES.USER) {
      await ensureUserIsNotLocked(user);
    }

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (e) {
    if (e instanceof HttpError) return next(e);
    if (e?.name === 'TokenExpiredError') return next(new HttpError(401, 'Token expired'));
    return next(new HttpError(401, 'Invalid token'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Unauthorized'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Forbidden'));
    return next();
  };
}

module.exports = { requireAuth, requireRole };
