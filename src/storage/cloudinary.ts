import { v2 as cloudinary } from 'cloudinary';

let configured = false;

const parseCloudinaryUrl = (
  url: string,
): { cloud_name: string; api_key: string; api_secret: string } | null => {
  // cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return null;
  return {
    api_key: decodeURIComponent(match[1]),
    api_secret: decodeURIComponent(match[2]),
    cloud_name: match[3].split('?')[0],
  };
};

export const getCloudinary = () => {
  if (!configured) {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (process.env.CLOUDINARY_URL) {
      const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
      if (parsed) {
        cloudName = cloudName || parsed.cloud_name;
        apiKey = apiKey || parsed.api_key;
        apiSecret = apiSecret || parsed.api_secret;
      }
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
};

export const CLOUDINARY_ROOT_FOLDER =
  process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'peja';

export const isCloudinaryConfigured = (): boolean => {
  if (process.env.CLOUDINARY_URL) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
};
