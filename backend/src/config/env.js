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
  app: {
    backendBaseUrl: process.env.BACKEND_BASE_URL ?? `http://localhost:${Number(process.env.PORT ?? 3001)}`,
    userAppUrl: process.env.USER_APP_URL ?? 'http://localhost:5173',
    staffAppUrl: process.env.STAFF_APP_URL ?? 'http://localhost:5174',
  },

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

  auth: {
    verificationExpiresMs: Number(process.env.EMAIL_VERIFICATION_EXPIRES_MS ?? 120000),
    paymentOtpExpiresMs: Number(process.env.PAYMENT_OTP_EXPIRES_MS ?? 300000),
  },

  smtp: {
    from: process.env.SMTP_FROM ?? process.env.SMTP_EMAIL ?? '',
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
    service: process.env.SMTP_SERVICE ?? 'gmail',
    user: process.env.SMTP_EMAIL ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
  },

  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    googleRedirectUri:
      process.env.GOOGLE_REDIRECT_URI ??
      `${process.env.BACKEND_BASE_URL ?? `http://localhost:${Number(process.env.PORT ?? 3001)}`}/api/auth/google/callback`,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    folder: process.env.CLOUDINARY_FOLDER ?? 'movix/posters',
  },

  seatHoldMs: Number(process.env.SEAT_HOLD_MS ?? 300000),
};

module.exports = { env };
