import {
  backgroundJobs,
  createDb,
  type Database,
  videoDownloads,
  videoVariants,
  videos,
} from "@vtp/drizzle";
import { eq } from "drizzle-orm";

import { TRANSCODING_RESOLUTIONS } from "../schema.ts";
import { testConfig } from "../setup.ts";

export const db: Database = createDb(testConfig.DATABASE_URL);

export async function resetPipelineTables() {
  await db.delete(videoDownloads);
  await db.delete(videoVariants);
  await db.delete(backgroundJobs);
  await db.delete(videos);
}

export async function getVideoById(videoId: string) {
  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  return video;
}

export async function getVariantsForVideo(videoId: string) {
  return db
    .select()
    .from(videoVariants)
    .where(eq(videoVariants.videoId, videoId));
}

export async function countDownloadsForUser(userId: string) {
  const rows = await db
    .select({ id: videoDownloads.id })
    .from(videoDownloads)
    .where(eq(videoDownloads.userId, userId));

  return rows.length;
}

export async function countDistinctDownloadsToday(userId: string) {
  const rows = await db
    .select({ videoId: videoDownloads.videoId })
    .from(videoDownloads)
    .where(eq(videoDownloads.userId, userId));

  return new Set(rows.map((row) => row.videoId)).size;
}

export async function seedReadyVideo(userId: string, label: string) {
  const [video] = await db
    .insert(videos)
    .values({
      userId,
      originalFileName: `${label}.mp4`,
      mimeType: "video/mp4",
      s3Bucket: testConfig.S3_UPLOAD_BUCKET,
      s3Key: `seed/${userId}/${label}.mp4`,
      fileSizeBytes: 1_000_000,
      status: "completed",
    })
    .returning();

  if (!video) {
    throw new Error("Failed to seed video");
  }

  for (const resolution of TRANSCODING_RESOLUTIONS) {
    await db.insert(videoVariants).values({
      videoId: video.id,
      resolution,
      s3Bucket: testConfig.S3_TRANSCODED_BUCKET,
      s3Key: `seed/${video.id}/${resolution}.mp4`,
      mimeType: "video/mp4",
      fileSizeBytes: 1_000_000,
      status: "ready",
    });
  }

  return video.id;
}

export async function seedActiveUpload(userId: string, label: string) {
  const createdAt = new Date(
    Date.now() - (testConfig.UPLOAD_COOLDOWN_SECONDS + 5) * 1000,
  );

  const [video] = await db
    .insert(videos)
    .values({
      userId,
      originalFileName: `${label}.mp4`,
      mimeType: "video/mp4",
      s3Bucket: testConfig.S3_UPLOAD_BUCKET,
      s3Key: `seed/${userId}/${label}.mp4`,
      fileSizeBytes: 1_000_000,
      status: "uploaded",
      createdAt,
      updatedAt: createdAt,
    })
    .returning();

  if (!video) {
    throw new Error("Failed to seed active upload");
  }

  return video.id;
}
