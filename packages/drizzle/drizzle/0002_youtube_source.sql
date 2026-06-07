CREATE TYPE "public"."video_source_type" AS ENUM('upload', 'youtube');--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "source_type" "video_source_type" DEFAULT 'upload' NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "source_url" text;
