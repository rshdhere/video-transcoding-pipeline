import type { Config } from "@vtp/config";
import {
  backgroundJobs,
  type Database,
  videoDownloads,
  videoVariants,
  videos,
} from "@vtp/drizzle";
import type {
  DownloadVideoInput,
  ImportYouTubeVideoInput,
  QueuePushInput,
  TranscodingResolution,
  UploadVideoInput,
} from "@vtp/validators";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import {
  ackSqsJob,
  dequeueSqsJob,
  enqueueSqsJob,
  nackSqsJob,
  resolveDownloadUrl,
  resolveUploadUrl,
} from "../aws-clients.ts";

export class PipelineError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const ACTIVE_UPLOAD_STATUSES = ["uploaded", "processing"] as const;
const QUEUE_RATE_LIMIT_PER_MINUTE = 20;
const DOWNLOAD_BURST_LIMIT = 30;
const SQS_POP_ATTEMPTS = 5;

type JobType = "transcoding" | "email_verification";

function variantMimeType(
  resolution: string,
): "video/mp4" | "audio/mpeg" {
  return resolution === "mp3" ? "audio/mpeg" : "video/mp4";
}

function variantS3Key(videoId: string, resolution: string): string {
  const extension = resolution === "mp3" ? "mp3" : "mp4";
  return `transcoded/${videoId}/${resolution}.${extension}`;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

async function assertUploadAllowed(
  db: Database,
  config: Config,
  userId: string,
) {
  const cooldownSince = new Date(
    Date.now() - config.UPLOAD_COOLDOWN_SECONDS * 1000,
  );

  const [recentUpload] = await db
    .select({ id: videos.id })
    .from(videos)
    .where(
      and(eq(videos.userId, userId), gte(videos.createdAt, cooldownSince)),
    )
    .orderBy(desc(videos.createdAt))
    .limit(1);

  if (recentUpload) {
    throw new PipelineError(
      "UPLOAD_COOLDOWN_ACTIVE",
      429,
      "Only one video can be uploaded within the cooldown window",
    );
  }

  const activeUploads = await db
    .select({ id: videos.id })
    .from(videos)
    .where(
      and(
        eq(videos.userId, userId),
        inArray(videos.status, [...ACTIVE_UPLOAD_STATUSES]),
      ),
    );

  if (activeUploads.length > 0) {
    throw new PipelineError(
      "CONCURRENT_UPLOAD_NOT_ALLOWED",
      429,
      "Concurrent video uploads are not allowed",
    );
  }
}

async function createTranscodingVariants(
  db: Database,
  config: Config,
  videoId: string,
) {
  for (const resolution of config.TRANSCODING_RESOLUTIONS) {
    await db
      .insert(videoVariants)
      .values({
        videoId,
        resolution: resolution as TranscodingResolution,
        s3Bucket: config.S3_TRANSCODED_BUCKET,
        s3Key: variantS3Key(videoId, resolution),
        mimeType: variantMimeType(resolution),
        status: "processing",
      })
      .onConflictDoUpdate({
        target: [videoVariants.videoId, videoVariants.resolution],
        set: {
          status: "processing",
          updatedAt: new Date(),
        },
      });
  }
}

export async function createVideoUpload(
  db: Database,
  config: Config,
  userId: string,
  input: UploadVideoInput,
) {
  await assertUploadAllowed(db, config, userId);

  const uploadKey = `uploads/${userId}/${crypto.randomUUID()}/${input.fileName}`;

  const [video] = await db
    .insert(videos)
    .values({
      userId,
      originalFileName: input.fileName,
      mimeType: input.mimeType,
      s3Bucket: config.S3_UPLOAD_BUCKET,
      s3Key: uploadKey,
      fileSizeBytes: input.fileSizeBytes,
      status: "uploaded",
    })
    .returning();

  if (!video) {
    throw new PipelineError(
      "UPLOAD_FAILED",
      500,
      "Failed to persist uploaded video",
    );
  }

  if (!config.AWS_ENABLED) {
    await pushBackgroundJob(db, config, {
      type: "transcoding",
      payload: { videoId: video.id, s3Key: uploadKey },
      videoId: video.id,
      userId,
    });
  }

  const uploadUrl = await resolveUploadUrl(
    config,
    config.S3_UPLOAD_BUCKET,
    uploadKey,
    input.mimeType,
  );

  return {
    video,
    uploadUrl,
  };
}

export async function createYouTubeImport(
  db: Database,
  config: Config,
  userId: string,
  input: ImportYouTubeVideoInput,
) {
  await assertUploadAllowed(db, config, userId);

  const videoId = extractYouTubeVideoId(input.url);
  if (!videoId) {
    throw new PipelineError(
      "INVALID_YOUTUBE_URL",
      400,
      "Could not extract a YouTube video ID from the URL",
    );
  }

  const uploadKey = `uploads/${userId}/${crypto.randomUUID()}/source.mp4`;

  const [video] = await db
    .insert(videos)
    .values({
      userId,
      originalFileName: `youtube-${videoId}.mp4`,
      mimeType: "video/mp4",
      s3Bucket: config.S3_UPLOAD_BUCKET,
      s3Key: uploadKey,
      fileSizeBytes: 0,
      sourceType: "youtube",
      sourceUrl: input.url,
      status: "processing",
    })
    .returning();

  if (!video) {
    throw new PipelineError(
      "IMPORT_FAILED",
      500,
      "Failed to persist YouTube import",
    );
  }

  await createTranscodingVariants(db, config, video.id);

  await pushBackgroundJob(db, config, {
    type: "transcoding",
    payload: {
      videoId: video.id,
      s3Key: uploadKey,
      sourceUrl: input.url,
      source: "youtube",
    },
    videoId: video.id,
    userId,
  });

  return { video };
}

export async function confirmVideoUpload(
  db: Database,
  config: Config,
  userId: string,
  videoId: string,
) {
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  if (!video) {
    throw new PipelineError("VIDEO_NOT_FOUND", 404, "Video not found");
  }

  if (video.userId !== userId) {
    throw new PipelineError("FORBIDDEN", 403, "You cannot confirm this upload");
  }

  if (video.status !== "uploaded") {
    throw new PipelineError(
      "UPLOAD_ALREADY_CONFIRMED",
      409,
      "Upload has already been confirmed or processing has started",
    );
  }

  const [existingJob] = await db
    .select()
    .from(backgroundJobs)
    .where(
      and(
        eq(backgroundJobs.videoId, videoId),
        inArray(backgroundJobs.status, ["queued", "processing"]),
      ),
    )
    .limit(1);

  if (existingJob) {
    return { video, job: existingJob };
  }

  const job = await pushBackgroundJob(db, config, {
    type: "transcoding",
    payload: { videoId: video.id, s3Key: video.s3Key },
    videoId: video.id,
    userId,
  });

  await createTranscodingVariants(db, config, video.id);

  return { video, job };
}

export async function createVideoDownload(
  db: Database,
  config: Config,
  userId: string,
  videoId: string,
  input: DownloadVideoInput,
) {
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  if (!video) {
    throw new PipelineError("VIDEO_NOT_FOUND", 404, "Video not found");
  }

  if (video.userId !== userId) {
    throw new PipelineError("FORBIDDEN", 403, "You cannot download this video");
  }

  const [variant] = await db
    .select()
    .from(videoVariants)
    .where(
      and(
        eq(videoVariants.videoId, videoId),
        eq(videoVariants.resolution, input.resolution),
      ),
    )
    .limit(1);

  if (!variant || variant.status !== "ready") {
    throw new PipelineError(
      "VARIANT_NOT_READY",
      404,
      "Requested transcoded variant is not available",
    );
  }

  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(videoDownloads)
      .where(eq(videoDownloads.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existing) {
      return {
        download: existing,
        variant,
        downloadUrl: await resolveDownloadUrl(
          config,
          variant.s3Bucket,
          variant.s3Key,
        ),
        deduplicated: true,
      };
    }
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const downloadsToday = await db
    .select({ videoId: videoDownloads.videoId })
    .from(videoDownloads)
    .where(
      and(
        eq(videoDownloads.userId, userId),
        gte(videoDownloads.downloadedAt, startOfDay),
      ),
    );

  const distinctVideoIds = new Set(downloadsToday.map((row) => row.videoId));

  if (
    !distinctVideoIds.has(videoId) &&
    distinctVideoIds.size >= config.MAX_DAILY_DOWNLOADS
  ) {
    throw new PipelineError(
      "DAILY_DOWNLOAD_LIMIT_REACHED",
      429,
      "Daily distinct video download limit reached",
    );
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourlyDownloadsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(videoDownloads)
    .where(
      and(
        eq(videoDownloads.userId, userId),
        gte(videoDownloads.downloadedAt, oneHourAgo),
      ),
    );
  const hourlyDownloads = hourlyDownloadsResult[0]?.count ?? 0;

  if (hourlyDownloads >= DOWNLOAD_BURST_LIMIT) {
    throw new PipelineError(
      "DOWNLOAD_RATE_LIMIT_EXCEEDED",
      429,
      "Download rate limit exceeded",
    );
  }

  const [download] = await db
    .insert(videoDownloads)
    .values({
      userId,
      videoId,
      variantId: variant.id,
      idempotencyKey: input.idempotencyKey,
    })
    .returning();

  return {
    download,
    variant,
    downloadUrl: await resolveDownloadUrl(
      config,
      variant.s3Bucket,
      variant.s3Key,
    ),
    deduplicated: false,
  };
}

export async function pushBackgroundJob(
  db: Database,
  config: Config,
  input: QueuePushInput & { userId?: string },
) {
  if (
    input.type === "transcoding" &&
    input.videoId &&
    input.userId
  ) {
    const [video] = await db
      .select({ userId: videos.userId })
      .from(videos)
      .where(eq(videos.id, input.videoId))
      .limit(1);

    if (!video || video.userId !== input.userId) {
      throw new PipelineError(
        "FORBIDDEN",
        403,
        "You cannot enqueue a transcoding job for this video",
      );
    }
  }

  if (input.userId) {
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentJobsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.userId, input.userId),
          gte(backgroundJobs.createdAt, oneMinuteAgo),
        ),
      );
    const recentJobs = recentJobsResult[0]?.count ?? 0;

    if (recentJobs >= QUEUE_RATE_LIMIT_PER_MINUTE) {
      throw new PipelineError(
        "QUEUE_RATE_LIMIT_EXCEEDED",
        429,
        "Queue rate limit exceeded",
      );
    }
  }

  const [job] = await db
    .insert(backgroundJobs)
    .values({
      type: input.type,
      userId: input.userId,
      videoId: input.videoId,
      payload: input.payload,
      status: "queued",
    })
    .returning();

  if (!job) {
    throw new PipelineError("QUEUE_PUSH_FAILED", 500, "Failed to enqueue job");
  }

  if (config.AWS_ENABLED) {
    const sqsMessage = await enqueueSqsJob(config, {
      jobId: job.id,
      type: input.type,
      userId: input.userId,
      videoId: input.videoId,
      payload: input.payload,
    });

    const [updatedJob] = await db
      .update(backgroundJobs)
      .set({
        sqsMessageId: sqsMessage.messageId,
        updatedAt: new Date(),
      })
      .where(eq(backgroundJobs.id, job.id))
      .returning();

    return updatedJob ?? job;
  }

  return job;
}

export async function popBackgroundJob(
  db: Database,
  config: Config,
  type: JobType,
  workerId: string,
  userId?: string,
) {
  if (config.AWS_ENABLED) {
    return popBackgroundJobFromSqs(db, config, type, workerId, userId);
  }

  return popBackgroundJobFromDb(db, type, workerId, userId);
}

export async function completeBackgroundJob(
  db: Database,
  config: Config,
  jobId: string,
) {
  const [existingJob] = await db
    .select()
    .from(backgroundJobs)
    .where(eq(backgroundJobs.id, jobId))
    .limit(1);

  if (!existingJob) {
    return null;
  }

  if (config.AWS_ENABLED && existingJob.receiptHandle) {
    await ackSqsJob(config, existingJob.type, existingJob.receiptHandle);
  }

  const [job] = await db
    .update(backgroundJobs)
    .set({
      status: "completed",
      completedAt: new Date(),
      receiptHandle: null,
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(backgroundJobs.id, jobId))
    .returning();

  return job;
}

export async function processTranscodingJob(
  db: Database,
  config: Config,
  workerUserId: string,
) {
  const job = await popBackgroundJob(
    db,
    config,
    "transcoding",
    workerUserId,
    workerUserId,
  );

  if (!job?.videoId) {
    return { processed: false as const, job: null };
  }

  for (const resolution of config.TRANSCODING_RESOLUTIONS) {
    await db
      .insert(videoVariants)
      .values({
        videoId: job.videoId,
        resolution: resolution as TranscodingResolution,
        s3Bucket: config.S3_TRANSCODED_BUCKET,
        s3Key: variantS3Key(job.videoId, resolution),
        mimeType: variantMimeType(resolution),
        fileSizeBytes: 1_000_000,
        status: "ready",
      })
      .onConflictDoUpdate({
        target: [videoVariants.videoId, videoVariants.resolution],
        set: {
          status: "ready",
          updatedAt: new Date(),
        },
      });
  }

  await db
    .update(videos)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(videos.id, job.videoId));

  const completedJob = await completeBackgroundJob(db, config, job.id);

  return { processed: true as const, job: completedJob };
}

export async function processEmailVerificationJob(
  db: Database,
  config: Config,
  workerId: string,
) {
  const job = await popBackgroundJob(
    db,
    config,
    "email_verification",
    workerId,
  );

  if (!job) {
    return { processed: false as const, job: null };
  }

  const completedJob = await completeBackgroundJob(db, config, job.id);

  return { processed: true as const, job: completedJob };
}

export async function listVideoVariants(db: Database, videoId: string) {
  return db
    .select()
    .from(videoVariants)
    .where(eq(videoVariants.videoId, videoId))
    .orderBy(asc(videoVariants.resolution));
}

async function popBackgroundJobFromDb(
  db: Database,
  type: JobType,
  workerId: string,
  userId?: string,
) {
  return db.transaction(async (tx) => {
    const conditions = [
      eq(backgroundJobs.type, type),
      eq(backgroundJobs.status, "queued"),
    ];

    if (type === "transcoding" && userId) {
      conditions.push(eq(backgroundJobs.userId, userId));
    }

    const [job] = await tx
      .select()
      .from(backgroundJobs)
      .where(and(...conditions))
      .orderBy(asc(backgroundJobs.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!job) {
      return null;
    }

    const [updated] = await tx
      .update(backgroundJobs)
      .set({
        status: "processing",
        lockedAt: new Date(),
        lockedBy: workerId,
        attempts: job.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(backgroundJobs.id, job.id))
      .returning();

    return updated;
  });
}

async function popBackgroundJobFromSqs(
  db: Database,
  config: Config,
  type: JobType,
  workerId: string,
  userId?: string,
) {
  for (let attempt = 0; attempt < SQS_POP_ATTEMPTS; attempt += 1) {
    const message = await dequeueSqsJob(config, type);

    if (!message) {
      return null;
    }

    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, message.body.jobId))
      .limit(1);

    if (!job || job.status !== "queued") {
      await ackSqsJob(config, type, message.receiptHandle);
      continue;
    }

    if (type === "transcoding" && userId && job.userId !== userId) {
      await nackSqsJob(config, type, message.receiptHandle);
      continue;
    }

    const [updated] = await db
      .update(backgroundJobs)
      .set({
        status: "processing",
        lockedAt: new Date(),
        lockedBy: workerId,
        attempts: job.attempts + 1,
        sqsMessageId: message.messageId,
        receiptHandle: message.receiptHandle,
        updatedAt: new Date(),
      })
      .where(eq(backgroundJobs.id, job.id))
      .returning();

    return updated ?? null;
  }

  return null;
}
