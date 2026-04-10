const { env } = require('../config/env');
const { HttpError } = require('./httpError');
const { sendMail } = require('../services/mailService');

async function sendOtpEmail(email, fullName, otp) {
  try {
    const expiresInMinutes = Math.max(1, Math.round(env.auth.paymentOtpExpiresMs / 60000));

    await sendMail({
      to: email,
      subject: 'Your Movix payment OTP',
      text: [
        `Hi ${fullName || 'there'},`,
        '',
        'Use this OTP to verify your payment:',
        otp,
        '',
        `This OTP is valid for ${expiresInMinutes} minute(s).`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f8fafc;color:#0f172a">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
            <div style="font-size:24px;font-weight:700;margin-bottom:8px">Movix Payment OTP</div>
            <p style="margin:0 0 16px">Hi ${fullName || 'there'},</p>
            <p style="margin:0 0 16px">Use this OTP to verify your payment:</p>
            <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0;color:#2563eb">${otp}</div>
            <p style="margin:16px 0 0">This OTP is valid for ${expiresInMinutes} minute(s).</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    throw new HttpError(502, `Failed to send OTP email: ${error.message}`);
  }
}

module.exports = { sendOtpEmail };
