const { v2: cloudinary } = require('cloudinary');
const { env } = require('../config/env');
const { HttpError } = require('../utils/httpError');

let configured = false;

function ensureCloudinaryConfigured() {
  if (
    !env.cloudinary.cloudName ||
    !env.cloudinary.apiKey ||
    !env.cloudinary.apiSecret
  ) {
    throw new HttpError(500, 'Cloudinary is not configured');
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    configured = true;
  }
}

async function uploadImageBuffer(buffer, { folder, publicId } = {}) {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: folder || env.cloudinary.folder,
        public_id: publicId,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    upload.end(buffer);
  });
}

module.exports = {
  uploadImageBuffer,
};
