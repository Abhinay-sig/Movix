const dotenv = require('dotenv');

dotenv.config();

function must(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === null || v === '') {
    throw new Error(`Missing env var ${name}`);
  }
  return v;
}

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),

  db: {
    host: must('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 3306),
    name: must('DB_NAME'),
    user: must('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
  },

  jwt: {
    secret: must('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  admin: {
    email: must('ADMIN_EMAIL'),
    password: must('ADMIN_PASSWORD'),
  },

  seatHoldMs: Number(process.env.SEAT_HOLD_MS ?? 300000),

  otp: {
    ttlMs: Number(process.env.OTP_TTL_MS ?? 600000),
    emailFrom: process.env.OTP_EMAIL_FROM ?? '',
    smtpHost: process.env.OTP_SMTP_HOST ?? '',
    smtpPort: Number(process.env.OTP_SMTP_PORT ?? 587),
    smtpSecure: String(process.env.OTP_SMTP_SECURE ?? 'false') === 'true',
    smtpUser: process.env.OTP_SMTP_USER ?? '',
    smtpPass: process.env.OTP_SMTP_PASS ?? '',
  },
};

module.exports = { env };
