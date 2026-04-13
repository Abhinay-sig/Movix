class HttpError extends Error {
  constructor(status, message, details, options = {}) {
    super(message);
    this.status = status;
    this.details = details;
    this.log = options.log ?? true;
  }
}

module.exports = { HttpError };
