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
      .default("onboarding@resend.dev"),
    MAIL_ENABLED: z
      .string()
      .default("true")
      .transform((value) => value === "true"),
    REQUIRE_EMAIL_VERIFICATION: z
      .string()
      .default("false")
      .transform((value) => value === "true"),
    AWS_REGION: z.string().default("us-east-1"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_UPLOAD_BUCKET: z.string().default("vtp-uploads"),
    S3_TRANSCODED_BUCKET: z.string().default("vtp-transcoded"),
    SQS_TRANSCODING_QUEUE_URL: z.string().optional(),
    SQS_EMAIL_VERIFICATION_QUEUE_URL: z.string().optional(),
    TRANSCODING_RESOLUTIONS: z
      .string()
      .default("480p,720p,1080p")
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
  );

export type Env = z.infer<typeof envSchema>;
