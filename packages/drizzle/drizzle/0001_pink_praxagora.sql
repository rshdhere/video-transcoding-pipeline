CREATE TYPE "public"."background_job_status" AS ENUM('queued', 'processing', 'completed', 'failed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."background_job_type" AS ENUM('transcoding', 'email_verification');--> statement-breakpoint
CREATE TYPE "public"."transcoding_resolution" AS ENUM('480p', '720p', '1080p');--> statement-breakpoint
CREATE TYPE "public"."variant_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."video_mime_type" AS ENUM('video/mp4', 'video/webm');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('uploaded', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "background_job_type" NOT NULL,
	"status" "background_job_status" DEFAULT 'queued' NOT NULL,
	"user_id" text,
	"video_id" text,
	"payload" jsonb NOT NULL,
	"sqs_message_id" text,
	"receipt_handle" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"locked_at" timestamp,
	"locked_by" text,
	"last_error" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "video_downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"video_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"idempotency_key" text,
	"downloaded_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"video_id" text NOT NULL,
	"resolution" "transcoding_resolution" NOT NULL,
	"s3_bucket" text NOT NULL,
	"s3_key" text NOT NULL,
	"mime_type" "video_mime_type" NOT NULL,
	"file_size_bytes" bigint,
	"status" "variant_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"original_file_name" text NOT NULL,
	"mime_type" "video_mime_type" NOT NULL,
	"s3_bucket" text NOT NULL,
	"s3_key" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"status" "video_status" DEFAULT 'uploaded' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_downloads" ADD CONSTRAINT "video_downloads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_downloads" ADD CONSTRAINT "video_downloads_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_downloads" ADD CONSTRAINT "video_downloads_variant_id_video_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."video_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_variants" ADD CONSTRAINT "video_variants_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "background_jobs_type_status_idx" ON "background_jobs" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "background_jobs_user_id_created_at_idx" ON "background_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "background_jobs_status_locked_at_idx" ON "background_jobs" USING btree ("status","locked_at");--> statement-breakpoint
CREATE INDEX "video_downloads_user_id_downloaded_at_idx" ON "video_downloads" USING btree ("user_id","downloaded_at");--> statement-breakpoint
CREATE INDEX "video_downloads_user_id_video_id_idx" ON "video_downloads" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "video_downloads_idempotency_key_uidx" ON "video_downloads" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "video_variants_video_id_idx" ON "video_variants" USING btree ("video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "video_variants_video_resolution_uidx" ON "video_variants" USING btree ("video_id","resolution");--> statement-breakpoint
CREATE INDEX "videos_user_id_idx" ON "videos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "videos_user_id_created_at_idx" ON "videos" USING btree ("user_id","created_at");