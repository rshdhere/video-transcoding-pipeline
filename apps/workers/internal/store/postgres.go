package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/job"
)

var ErrJobNotQueued = errors.New("job is not queued")

type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(ctx context.Context, databaseURL string) (*Postgres, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	return &Postgres{pool: pool}, nil
}

func (s *Postgres) Close() {
	s.pool.Close()
}

func (s *Postgres) GetJob(ctx context.Context, jobID string) (*job.Record, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, type, status, user_id, video_id, payload::text, receipt_handle, attempts, max_attempts
		FROM background_jobs
		WHERE id = $1
	`, jobID)

	record, err := scanJob(row)
	if err != nil {
		return nil, err
	}

	return record, nil
}

func (s *Postgres) LockJob(
	ctx context.Context,
	jobID string,
	workerID string,
	sqsMessageID string,
	receiptHandle string,
) (*job.Record, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE background_jobs
		SET
			status = 'processing',
			locked_at = NOW(),
			locked_by = $2,
			attempts = attempts + 1,
			sqs_message_id = $3,
			receipt_handle = $4,
			updated_at = NOW()
		WHERE id = $1 AND status = 'queued'
		RETURNING id, type, status, user_id, video_id, payload::text, receipt_handle, attempts, max_attempts
	`, jobID, workerID, sqsMessageID, receiptHandle)

	record, err := scanJob(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrJobNotQueued
	}
	if err != nil {
		return nil, err
	}

	return record, nil
}

func (s *Postgres) CompleteJob(ctx context.Context, jobID string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE background_jobs
		SET
			status = 'completed',
			completed_at = NOW(),
			receipt_handle = NULL,
			locked_at = NULL,
			locked_by = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, jobID)

	return err
}

func (s *Postgres) FailJob(ctx context.Context, jobID string, message string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE background_jobs
		SET
			status = 'failed',
			last_error = $2,
			receipt_handle = NULL,
			locked_at = NULL,
			locked_by = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, jobID, message)

	return err
}

func (s *Postgres) GetVideo(ctx context.Context, videoID string) (*job.Video, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, user_id, s3_bucket, s3_key, mime_type, source_type, source_url, status
		FROM videos
		WHERE id = $1
	`, videoID)

	var video job.Video
	if err := row.Scan(
		&video.ID,
		&video.UserID,
		&video.S3Bucket,
		&video.S3Key,
		&video.MimeType,
		&video.SourceType,
		&video.SourceURL,
		&video.Status,
	); err != nil {
		return nil, err
	}

	return &video, nil
}

func (s *Postgres) UpdateVideoAfterDownload(
	ctx context.Context,
	videoID string,
	fileName string,
	fileSize int64,
) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE videos
		SET
			original_file_name = $2,
			file_size_bytes = $3,
			updated_at = NOW()
		WHERE id = $1
	`, videoID, fileName, fileSize)

	return err
}

func (s *Postgres) UpdateVideoStatus(ctx context.Context, videoID string, status string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE videos
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`, videoID, status)

	return err
}

func (s *Postgres) UpsertVariant(
	ctx context.Context,
	videoID string,
	resolution string,
	bucket string,
	key string,
	mimeType string,
	fileSize int64,
) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO video_variants (
			id, video_id, resolution, s3_bucket, s3_key, mime_type, file_size_bytes, status, created_at, updated_at
		)
		VALUES ($7, $1, $2, $3, $4, $5, $6, 'ready', NOW(), NOW())
		ON CONFLICT (video_id, resolution)
		DO UPDATE SET
			s3_bucket = EXCLUDED.s3_bucket,
			s3_key = EXCLUDED.s3_key,
			mime_type = EXCLUDED.mime_type,
			file_size_bytes = EXCLUDED.file_size_bytes,
			status = 'ready',
			updated_at = NOW()
	`, videoID, resolution, bucket, key, mimeType, fileSize, uuid.NewString())

	return err
}

func scanJob(row pgx.Row) (*job.Record, error) {
	var record job.Record
	var userID *string
	var videoID *string
	var payload string

	if err := row.Scan(
		&record.ID,
		&record.Type,
		&record.Status,
		&userID,
		&videoID,
		&payload,
		&record.ReceiptHandle,
		&record.Attempts,
		&record.MaxAttempts,
	); err != nil {
		return nil, err
	}

	record.UserID = userID
	record.VideoID = videoID
	record.Payload = []byte(payload)

	return &record, nil
}

func (s *Postgres) WaitForHealthy(ctx context.Context, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	return s.pool.Ping(ctx)
}
