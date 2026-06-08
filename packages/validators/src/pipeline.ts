import { z } from "zod";

export const uploadVideoSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(["video/mp4", "video/webm"]),
  fileSizeBytes: z.number().int().positive().max(500_000_000),
});

export type UploadVideoInput = z.infer<typeof uploadVideoSchema>;

const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{11}(?:[?&][\w=%.-]*)?$/;

export const importYouTubeVideoSchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => YOUTUBE_URL_PATTERN.test(value), {
      message: "Must be a valid YouTube video URL",
    }),
});

export type ImportYouTubeVideoInput = z.infer<typeof importYouTubeVideoSchema>;

export const transcodingResolutionSchema = z.enum([
  "480p",
  "720p",
  "1080p",
  "2160p",
  "mp3",
]);

export type TranscodingResolution = z.infer<typeof transcodingResolutionSchema>;

export function variantS3Key(videoId: string, resolution: string): string {
  if (resolution === "mp3") {
    return `audio/${videoId}/audio.mp3`;
  }

  return `hls/${videoId}/${resolution}/playlist.m3u8`;
}

export function hlsMasterS3Key(videoId: string): string {
  return `hls/${videoId}/master.m3u8`;
}

export function thumbnailS3Key(videoId: string): string {
  return `thumbnails/${videoId}/poster.jpg`;
}

export function variantMimeType(
  resolution: string,
): "application/vnd.apple.mpegurl" | "audio/mpeg" {
  return resolution === "mp3" ? "audio/mpeg" : "application/vnd.apple.mpegurl";
}

export const downloadVideoSchema = z.object({
  resolution: transcodingResolutionSchema,
  idempotencyKey: z.string().min(1).optional(),
});

export type DownloadVideoInput = z.infer<typeof downloadVideoSchema>;

export const queuePushSchema = z.object({
  type: z.enum(["transcoding", "email_verification"]),
  payload: z
    .record(z.string(), z.unknown())
    .refine(
      (value) =>
        typeof value === "object" && value !== null && !Array.isArray(value),
      "Payload must be a JSON object",
    ),
  videoId: z.string().min(1).optional(),
});

export type QueuePushInput = z.infer<typeof queuePushSchema>;

export const queuePopSchema = z.object({
  type: z.enum(["transcoding", "email_verification"]),
});

export type QueuePopInput = z.infer<typeof queuePopSchema>;

export const workerProcessSchema = z.object({
  type: z.enum(["transcoding", "email_verification"]),
});

export type WorkerProcessInput = z.infer<typeof workerProcessSchema>;
