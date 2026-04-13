const { HttpError } = require('../utils/httpError');

function errorHandler(err, req, res, next) {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof HttpError ? err.message : 'Internal Server Error';
  const details = err instanceof HttpError ? err.details : undefined;

  if (status >= 500 && err?.log !== false) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({ error: { message, details } });
}

module.exports = { errorHandler };
