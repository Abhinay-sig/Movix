const { z } = require('zod');
const { HttpError } = require('../utils/httpError');
const { signToken } = require('../utils/jwt');
const { db } = require('../models');
const { env } = require('../config/env');

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

function userToJson(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

async function signup(req, res, next) {
  try {
    const body = signupSchema.parse(req.body);
    const email = body.email.toLowerCase();
    const exists = await db.User.findOne({ where: { email } });
    if (exists) throw new HttpError(409, 'Email already in use');

    const passwordHash = await db.User.hashPassword(body.password);
    const user = await db.User.create({
      email,
      name: body.name,
      passwordHash,
      role: body.role ?? db.USER_ROLES.USER,
    });

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user: userToJson(user) });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function login(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);
    const email = body.email.toLowerCase();
    const user = await db.User.scope('withPassword').findOne({ where: { email } });
    if (!user) throw new HttpError(401, 'Invalid credentials');
    if (user.isBlocked) throw new HttpError(403, 'User is blocked');
    const ok = await user.verifyPassword(body.password);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: userToJson(user) });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

async function adminLogin(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);
    const email = body.email.toLowerCase();
    if (email !== env.admin.email.toLowerCase() || body.password !== env.admin.password) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const [admin] = await db.User.scope('withPassword').findOrCreate({
      where: { email },
      defaults: {
        email,
        name: 'Admin',
        role: db.USER_ROLES.ADMIN,
        passwordHash: await db.User.hashPassword(env.admin.password),
      },
    });

    const token = signToken({ sub: admin.id, role: admin.role });
    res.json({ token, user: userToJson(admin) });
  } catch (e) {
    if (e instanceof z.ZodError) return next(new HttpError(400, 'Invalid input', e.flatten()));
    return next(e);
  }
}

module.exports = { signup, login, adminLogin };

