import { testConfig } from "./setup.ts";

export const TRANSCODING_RESOLUTIONS = testConfig.TRANSCODING_RESOLUTIONS;

export type TranscodingResolution = (typeof TRANSCODING_RESOLUTIONS)[number];

export const ALLOWED_UPLOAD_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

export const MAX_DAILY_DOWNLOADS = testConfig.MAX_DAILY_DOWNLOADS;

export const UPLOAD_COOLDOWN_SECONDS = testConfig.UPLOAD_COOLDOWN_SECONDS;
