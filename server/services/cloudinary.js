import { v2 as cloudinary } from 'cloudinary';

if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function cloudinaryReady() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function uploadImage(file, kind) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `skillconnect/${kind}`,
      resource_type: 'image',
      type: kind === 'id' ? 'authenticated' : 'upload',
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(file.buffer);
  });
}

export function signedPrivateImage(publicId) {
  return publicId ? cloudinary.url(publicId, { type: 'authenticated', resource_type: 'image', secure: true, sign_url: true, expires_at: Math.floor(Date.now() / 1000) + 300 }) : null;
}
