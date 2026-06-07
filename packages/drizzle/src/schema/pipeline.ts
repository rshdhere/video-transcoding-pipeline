import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth.ts";

export const videoMimeTypeEnum = pgEnum("video_mime_type", [
  "video/mp4",
  "video/webm",
  "audio/mpeg",
]);

export const videoStatusEnum = pgEnum("video_status", [
  "uploaded",
  "processing",
  "completed",
  "failed",
]);

export const videoSourceTypeEnum = pgEnum("video_source_type", [
  "upload",
  "youtube",
]);

export const transcodingResolutionEnum = pgEnum("transcoding_resolution", [
  "480p",
  "720p",
  "1080p",
  "2160p",
  "mp3",
]);

export const variantStatusEnum = pgEnum("variant_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const backgroundJobTypeEnum = pgEnum("background_job_type", [
  "transcoding",
  "email_verification",
]);

export const backgroundJobStatusEnum = pgEnum("background_job_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "dead_letter",
]);

export const videos = pgTable(
  "videos",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    originalFileName: text("original_file_name").notNull(),
    mimeType: videoMimeTypeEnum("mime_type").notNull(),
    s3Bucket: text("s3_bucket").notNull(),
    s3Key: text("s3_key").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    sourceType: videoSourceTypeEnum("source_type")
      .notNull()
      .default("upload"),
    sourceUrl: text("source_url"),
    status: videoStatusEnum("status").notNull().default("uploaded"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("videos_user_id_idx").on(table.userId),
    index("videos_user_id_created_at_idx").on(table.userId, table.createdAt),
  ],
);

export const videoVariants = pgTable(
  "video_variants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    resolution: transcodingResolutionEnum("resolution").notNull(),
    s3Bucket: text("s3_bucket").notNull(),
    s3Key: text("s3_key").notNull(),
    mimeType: videoMimeTypeEnum("mime_type").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    status: variantStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("video_variants_video_id_idx").on(table.videoId),
    uniqueIndex("video_variants_video_resolution_uidx").on(
      table.videoId,
      table.resolution,
    ),
  ],
);

export const videoDownloads = pgTable(
  "video_downloads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => videoVariants.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key"),
    downloadedAt: timestamp("downloaded_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("video_downloads_user_id_downloaded_at_idx").on(
      table.userId,
      table.downloadedAt,
    ),
    index("video_downloads_user_id_video_id_idx").on(
      table.userId,
      table.videoId,
    ),
    uniqueIndex("video_downloads_idempotency_key_uidx").on(
      table.idempotencyKey,
    ),
  ],
);

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: backgroundJobTypeEnum("type").notNull(),
    status: backgroundJobStatusEnum("status").notNull().default("queued"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    videoId: text("video_id").references(() => videos.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").notNull(),
    sqsMessageId: text("sqs_message_id"),
    receiptHandle: text("receipt_handle"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lockedAt: timestamp("locked_at"),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("background_jobs_type_status_idx").on(table.type, table.status),
    index("background_jobs_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("background_jobs_status_locked_at_idx").on(
      table.status,
      table.lockedAt,
    ),
  ],
);

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(user, {
    fields: [videos.userId],
    references: [user.id],
  }),
  variants: many(videoVariants),
  downloads: many(videoDownloads),
  jobs: many(backgroundJobs),
}));

export const videoVariantsRelations = relations(videoVariants, ({ one, many }) => ({
  video: one(videos, {
    fields: [videoVariants.videoId],
    references: [videos.id],
  }),
  downloads: many(videoDownloads),
}));

export const videoDownloadsRelations = relations(videoDownloads, ({ one }) => ({
  user: one(user, {
    fields: [videoDownloads.userId],
    references: [user.id],
  }),
  video: one(videos, {
    fields: [videoDownloads.videoId],
    references: [videos.id],
  }),
  variant: one(videoVariants, {
    fields: [videoDownloads.variantId],
    references: [videoVariants.id],
  }),
}));

export const backgroundJobsRelations = relations(backgroundJobs, ({ one }) => ({
  user: one(user, {
    fields: [backgroundJobs.userId],
    references: [user.id],
  }),
  video: one(videos, {
    fields: [backgroundJobs.videoId],
    references: [videos.id],
  }),
}));
