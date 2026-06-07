import "dotenv/config";

import { loadConfig } from "@vtp/config";

export const testConfig = loadConfig({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://vtp:vtp@localhost:5432/vtp",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    "dev-secret-key-at-least-32-characters-long",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  SERVER_PORT: process.env.SERVER_PORT ?? "3001",
  TRUSTED_ORIGINS:
    process.env.TRUSTED_ORIGINS ??
    "http://localhost:3000,http://localhost:3001",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "re_test_key",
  RESEND_FROM_EMAIL:
    process.env.RESEND_FROM_EMAIL ?? "noreply@mail.raashed.cloud",
  MAIL_ENABLED: process.env.MAIL_ENABLED ?? "false",
  REQUIRE_EMAIL_VERIFICATION:
    process.env.REQUIRE_EMAIL_VERIFICATION ?? "false",
  AWS_ENABLED: process.env.AWS_ENABLED ?? "false",
  AWS_REGION: process.env.AWS_REGION ?? "us-east-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? "test-access-key",
  AWS_SECRET_ACCESS_KEY:
    process.env.AWS_SECRET_ACCESS_KEY ?? "test-secret-key",
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE ?? "false",
  SQS_ENDPOINT: process.env.SQS_ENDPOINT,
  S3_UPLOAD_BUCKET: process.env.S3_UPLOAD_BUCKET ?? "vtp-uploads",
  S3_TRANSCODED_BUCKET:
    process.env.S3_TRANSCODED_BUCKET ?? "vtp-transcoded",
  SQS_TRANSCODING_QUEUE_URL:
    process.env.SQS_TRANSCODING_QUEUE_URL ??
    "http://localhost:4566/000000000000/vtp-transcoding",
  SQS_EMAIL_VERIFICATION_QUEUE_URL:
    process.env.SQS_EMAIL_VERIFICATION_QUEUE_URL ??
    "http://localhost:4566/000000000000/vtp-email-verification",
  TRANSCODING_RESOLUTIONS:
    process.env.TRANSCODING_RESOLUTIONS ?? "480p,720p,1080p,2160p,mp3",
  MAX_DAILY_DOWNLOADS: process.env.MAX_DAILY_DOWNLOADS ?? "10",
  UPLOAD_COOLDOWN_SECONDS: process.env.UPLOAD_COOLDOWN_SECONDS ?? "30",
});
