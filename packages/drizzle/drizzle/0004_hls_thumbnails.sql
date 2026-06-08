ALTER TYPE "public"."video_mime_type" ADD VALUE 'application/vnd.apple.mpegurl';--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "thumbnail_s3_bucket" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "thumbnail_s3_key" text;
