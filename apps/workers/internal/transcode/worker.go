package transcode

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/config"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/job"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/queue"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/storage"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/store"
)

type Worker struct {
	cfg    config.Config
	store  *store.Postgres
	queue  *queue.Client
	s3     *storage.Client
	sema   chan struct{}
}

func NewWorker(
	cfg config.Config,
	store *store.Postgres,
	queueClient *queue.Client,
	s3Client *storage.Client,
) *Worker {
	return &Worker{
		cfg:   cfg,
		store: store,
		queue: queueClient,
		s3:    s3Client,
		sema:  make(chan struct{}, cfg.MaxConcurrentPolls),
	}
}

func (w *Worker) Run(ctx context.Context) error {
	if err := ValidateFFmpeg(ctx, w.cfg.FFmpegPath); err != nil {
		return err
	}

	log.Printf("transcode worker listening on %s", w.cfg.SQSTranscodeURL)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			if err := w.processNext(ctx); err != nil {
				log.Printf("transcode worker error: %v", err)
			}
		}
	}
}

func (w *Worker) processNext(ctx context.Context) error {
	select {
	case w.sema <- struct{}{}:
		defer func() { <-w.sema }()
	case <-ctx.Done():
		return ctx.Err()
	}

	message, err := w.queue.Receive(ctx)
	if err != nil {
		return fmt.Errorf("receive sqs message: %w", err)
	}
	if message == nil {
		return nil
	}

	jobRecord, err := w.store.GetJob(ctx, message.Body.JobID)
	if err != nil {
		if releaseErr := w.queue.Release(ctx, message.ReceiptHandle); releaseErr != nil {
			return releaseErr
		}
		return err
	}

	if jobRecord.Status != "queued" {
		return w.queue.Delete(ctx, message.ReceiptHandle)
	}

	videoID := message.Body.VideoID
	if videoID == "" && jobRecord.VideoID != nil {
		videoID = *jobRecord.VideoID
	}

	if videoID == "" {
		return w.failJob(ctx, jobRecord, message.ReceiptHandle, "transcoding job is missing videoId")
	}

	video, err := w.store.GetVideo(ctx, videoID)
	if err != nil {
		if releaseErr := w.queue.Release(ctx, message.ReceiptHandle); releaseErr != nil {
			return releaseErr
		}
		return err
	}

	exists, err := w.s3.ObjectExists(ctx, video.S3Bucket, video.S3Key)
	if err != nil {
		if releaseErr := w.queue.Release(ctx, message.ReceiptHandle); releaseErr != nil {
			return releaseErr
		}
		return err
	}

	if !exists {
		return w.queue.Release(ctx, message.ReceiptHandle)
	}

	record, err := w.store.LockJob(
		ctx,
		message.Body.JobID,
		w.cfg.WorkerID,
		message.MessageID,
		message.ReceiptHandle,
	)
	if err != nil {
		if err == store.ErrJobNotQueued {
			return w.queue.Delete(ctx, message.ReceiptHandle)
		}

		if releaseErr := w.queue.Release(ctx, message.ReceiptHandle); releaseErr != nil {
			return releaseErr
		}

		return err
	}

	if record.VideoID == nil || *record.VideoID == "" {
		return w.failJob(ctx, record, message.ReceiptHandle, "transcoding job is missing videoId")
	}

	if err := w.transcodeVideo(ctx, *record.VideoID); err != nil {
		return w.failJob(ctx, record, message.ReceiptHandle, err.Error())
	}

	if err := w.store.CompleteJob(ctx, record.ID); err != nil {
		return err
	}

	return w.queue.Delete(ctx, message.ReceiptHandle)
}

func (w *Worker) transcodeVideo(ctx context.Context, videoID string) error {
	video, err := w.store.GetVideo(ctx, videoID)
	if err != nil {
		return fmt.Errorf("load video: %w", err)
	}

	if err := w.store.UpdateVideoStatus(ctx, videoID, "processing"); err != nil {
		return err
	}

	workDir, err := os.MkdirTemp(w.cfg.TempDir, "vtp-transcode-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(workDir)

	sourceExt := filepath.Ext(video.S3Key)
	if sourceExt == "" {
		sourceExt = ".mp4"
	}

	sourcePath := filepath.Join(workDir, "source"+sourceExt)
	if err := w.s3.Download(ctx, video.S3Bucket, video.S3Key, sourcePath); err != nil {
		return fmt.Errorf("download source video: %w", err)
	}

	for _, resolution := range w.cfg.TranscodingResolutions {
		outputPath := filepath.Join(workDir, resolution+".mp4")
		if err := Transcode(ctx, w.cfg.FFmpegPath, sourcePath, outputPath, resolution); err != nil {
			return err
		}

		outputKey := fmt.Sprintf("transcoded/%s/%s.mp4", videoID, resolution)
		if err := w.s3.Upload(
			ctx,
			w.cfg.S3TranscodedBucket,
			outputKey,
			outputPath,
			"video/mp4",
		); err != nil {
			return fmt.Errorf("upload %s variant: %w", resolution, err)
		}

		size, err := storage.FileSize(outputPath)
		if err != nil {
			return err
		}

		if err := w.store.UpsertVariant(
			ctx,
			videoID,
			resolution,
			w.cfg.S3TranscodedBucket,
			outputKey,
			"video/mp4",
			size,
		); err != nil {
			return err
		}

	}

	if err := w.store.UpdateVideoStatus(ctx, videoID, "completed"); err != nil {
		return err
	}

	return nil
}

func (w *Worker) failJob(ctx context.Context, record *job.Record, receiptHandle, message string) error {
	if record.VideoID != nil && *record.VideoID != "" {
		_ = w.store.UpdateVideoStatus(ctx, *record.VideoID, "failed")
	}

	if err := w.store.FailJob(ctx, record.ID, message); err != nil {
		return err
	}

	return w.queue.Delete(ctx, receiptHandle)
}
