export type VideoStatus = "uploaded" | "processing" | "completed" | "failed";

export type VariantStatus = "pending" | "processing" | "ready" | "failed";

export type Resolution = "480p" | "720p" | "1080p";

export type Video = {
  id: string;
  userId: string;
  originalFileName: string;
  mimeType: "video/mp4" | "video/webm";
  s3Bucket: string;
  s3Key: string;
  fileSizeBytes: number;
  status: VideoStatus;
  createdAt: string;
  updatedAt: string;
};

export type VideoVariant = {
  id: string;
  videoId: string;
  resolution: Resolution;
  s3Bucket: string;
  s3Key: string;
  mimeType: "video/mp4" | "video/webm";
  fileSizeBytes: number | null;
  status: VariantStatus;
  createdAt: string;
  updatedAt: string;
};

export type ApiError = {
  error: string;
  code?: string;
  issues?: unknown;
};
