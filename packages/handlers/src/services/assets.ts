import {
  createCloudFrontUrl,
  createDownloadPresignedUrl,
} from "@vtp/aws";
import type { Config } from "@vtp/config";

import { getS3Client } from "../aws-clients.ts";

export async function resolveAssetUrl(
  config: Config,
  bucket: string,
  key: string,
) {
  if (config.CLOUDFRONT_DOMAIN) {
    return createCloudFrontUrl(config.CLOUDFRONT_DOMAIN, key);
  }

  if (!config.AWS_ENABLED) {
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  return createDownloadPresignedUrl(
    getS3Client(config),
    bucket,
    key,
    config.DOWNLOAD_PRESIGNED_URL_EXPIRES_SECONDS,
  );
}

export async function resolveThumbnailUrl(
  config: Config,
  video: {
    thumbnailS3Bucket: string | null;
    thumbnailS3Key: string | null;
  },
) {
  if (!video.thumbnailS3Key) {
    return null;
  }

  return resolveAssetUrl(
    config,
    video.thumbnailS3Bucket ?? config.S3_TRANSCODED_BUCKET,
    video.thumbnailS3Key,
  );
}
