import { z } from "zod";

export const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
    SERVER_PORT: z.coerce.number().int().positive().default(3001),
    TRUSTED_ORIGINS: z
      .string()
      .default("http://localhost:3000,http://localhost:3001")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z
      .email()
      .default("noreply@mail.raashed.cloud"),
    MAIL_ENABLED: z
      .string()
      .default("true")
      .transform((value) => value === "true"),
    REQUIRE_EMAIL_VERIFICATION: z
      .string()
      .default("false")
      .transform((value) => value === "true"),
    AWS_ENABLED: z
      .string()
      .default("false")
      .transform((value) => value === "true"),
    AWS_REGION: z.string().default("us-east-1"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_FORCE_PATH_STYLE: z
      .string()
      .default("false")
      .transform((value) => value === "true"),
    S3_UPLOAD_BUCKET: z.string().default("vtp-uploads"),
    S3_TRANSCODED_BUCKET: z.string().default("vtp-transcoded"),
    CLOUDFRONT_DOMAIN: z.string().optional(),
    UPLOAD_PRESIGNED_URL_EXPIRES_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(3600),
    DOWNLOAD_PRESIGNED_URL_EXPIRES_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(3600),
    SQS_ENDPOINT: z.string().url().optional(),
    SQS_TRANSCODING_QUEUE_URL: z.string().optional(),
    SQS_EMAIL_VERIFICATION_QUEUE_URL: z.string().optional(),
    TRANSCODING_RESOLUTIONS: z
      .string()
      .default("480p,720p,1080p,2160p,mp3")
      .transform((value) =>
        value
          .split(",")
          .map((resolution) => resolution.trim())
          .filter(Boolean),
      ),
    MAX_DAILY_DOWNLOADS: z.coerce.number().int().positive().default(10),
    UPLOAD_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(30),
  })
  .refine(
    (env) => !env.MAIL_ENABLED || Boolean(env.RESEND_API_KEY?.length),
    {
      message: "RESEND_API_KEY is required when MAIL_ENABLED is true",
      path: ["RESEND_API_KEY"],
    },
  )
  .refine(
    (env) =>
      !env.AWS_ENABLED ||
      Boolean(
        env.AWS_ACCESS_KEY_ID?.length &&
          env.AWS_SECRET_ACCESS_KEY?.length &&
          env.SQS_TRANSCODING_QUEUE_URL?.length &&
          env.SQS_EMAIL_VERIFICATION_QUEUE_URL?.length,
      ),
    {
      message:
        "AWS credentials and SQS queue URLs are required when AWS_ENABLED is true",
      path: ["AWS_ENABLED"],
    },
  );

export type Env = z.infer<typeof envSchema>;
