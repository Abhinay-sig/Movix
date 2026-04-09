const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.email.user || !env.email.password) {
    throw new HttpError(500, 'Email delivery is not configured');
  }

  transporter = nodemailer.createTransport(
    env.email.host
      ? {
          host: env.email.host,
          port: env.email.port,
          secure: env.email.secure,
          auth: {
            user: env.email.user,
            pass: env.email.password,
          },
        }
      : {
          service: env.email.service,
          auth: {
            user: env.email.user,
            pass: env.email.password,
          },
        }
  );

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: env.email.from || env.email.user,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };
