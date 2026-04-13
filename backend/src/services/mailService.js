const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtp.user || !env.smtp.password) {
    throw new HttpError(503, 'Email delivery is not configured', undefined, { log: false });
  }

  transporter = nodemailer.createTransport(
    env.smtp.host
      ? {
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.secure,
          auth: {
            user: env.smtp.user,
            pass: env.smtp.password,
          },
        }
      : {
          service: env.smtp.service,
          auth: {
            user: env.smtp.user,
            pass: env.smtp.password,
          },
        }
  );

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.smtp.from || env.smtp.user,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };
