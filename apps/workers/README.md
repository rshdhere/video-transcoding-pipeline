# Workers (Go)

Background workers for the video transcoding pipeline. They consume SQS jobs, update Postgres metadata, and interact with S3.

## Workers

| Worker | Queue | Responsibilities |
|--------|-------|------------------|
| Transcode | `SQS_TRANSCODING_QUEUE_URL` | Download raw upload from S3, ffmpeg transcode to 480p/720p/1080p, upload outputs, update `videos` and `video_variants` |
| Email | `SQS_EMAIL_VERIFICATION_QUEUE_URL` | Send verification email via Resend, complete `background_jobs` row |

## Run

```bash
# from repo root
bun run dev --filter=@vtp/workers

# or from this directory
go run ./cmd/worker
```

Copy `.env.example` values into your shell or a local `.env` file before starting the workers alongside LocalStack and Postgres.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKERS_TRANSCODE_ENABLED` | `true` | Enable the transcode worker |
| `WORKERS_EMAIL_ENABLED` | `true` | Enable the email worker |
| `WORKERS_ID` | hostname | Worker identity stored in `background_jobs.locked_by` |
| `WORKERS_MAX_CONCURRENT_POLLS` | `3` | Max in-flight jobs per worker type |
| `DATABASE_URL` | local Postgres URL | Job and video metadata store |
| `FFMPEG_PATH` | `ffmpeg` | ffmpeg binary used for transcoding |
| `SQS_TRANSCODING_QUEUE_URL` | — | Transcode queue URL |
| `SQS_EMAIL_VERIFICATION_QUEUE_URL` | — | Email verification queue URL |
| `S3_UPLOAD_BUCKET` | `vtp-uploads` | Raw upload bucket |
| `S3_TRANSCODED_BUCKET` | `vtp-transcoded` | Transcoded output bucket |
| `MAIL_ENABLED` | `false` | Send real email through Resend |

## Flow

```text
API push -> Postgres background_jobs + SQS message
Go worker -> SQS receive -> lock job in Postgres
Transcode worker -> S3 download -> ffmpeg -> S3 upload -> Postgres variants
Email worker -> Resend API -> Postgres job complete
SQS delete on success
```

## Build

```bash
go build -o bin/worker ./cmd/worker
```

## Test

```bash
go test ./...
```
