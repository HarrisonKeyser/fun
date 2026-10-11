// Thumbnails and other images are hosted in Harrison's AWS S3 bucket.
const IMAGE_HOST = 'https://harrisonkeyserfun.s3.us-east-2.amazonaws.com';

export function imageUrl(fileName) {
  return `${IMAGE_HOST}/${fileName}`;
}
