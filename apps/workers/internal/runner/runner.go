package runner

import (
	"context"
	"fmt"
	"log"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/config"
	emailworker "github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/email"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/queue"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/storage"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/store"
	transcodeworker "github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/transcode"
)

type Runner struct {
	cfg config.Config
}

func New(cfg config.Config) *Runner {
	return &Runner{cfg: cfg}
}

func (r *Runner) Run(ctx context.Context) error {
	if !r.cfg.TranscodeEnabled && !r.cfg.EmailEnabled {
		log.Println("no workers enabled")
		<-ctx.Done()
		return ctx.Err()
	}

	db, err := store.NewPostgres(ctx, r.cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	if err := db.WaitForHealthy(ctx, 10*time.Second); err != nil {
		return fmt.Errorf("database unavailable: %w", err)
	}

	group, ctx := errgroup.WithContext(ctx)
	workersStarted := 0

	if r.cfg.TranscodeEnabled {
		if r.cfg.SQSTranscodeURL == "" {
			log.Println("transcode worker skipped: SQS_TRANSCODING_QUEUE_URL is not set")
		} else {
			transcodeQueue, err := queue.NewTranscodeClient(r.cfg)
			if err != nil {
				return fmt.Errorf("create transcode queue client: %w", err)
			}

			s3Client, err := storage.New(r.cfg)
			if err != nil {
				return fmt.Errorf("create s3 client: %w", err)
			}

			worker := transcodeworker.NewWorker(r.cfg, db, transcodeQueue, s3Client)
			workersStarted++
			group.Go(func() error {
				return worker.Run(ctx)
			})
		}
	}

	if r.cfg.EmailEnabled {
		if r.cfg.SQSEmailURL == "" {
			log.Println("email worker skipped: SQS_EMAIL_VERIFICATION_QUEUE_URL is not set")
		} else {
			emailQueue, err := queue.NewEmailClient(r.cfg)
			if err != nil {
				return fmt.Errorf("create email queue client: %w", err)
			}

			sender := emailworker.NewSender(
				r.cfg.ResendAPIKey,
				r.cfg.ResendFrom,
				r.cfg.MailEnabled,
			)

			worker := emailworker.NewWorker(r.cfg, db, emailQueue, sender)
			workersStarted++
			group.Go(func() error {
				return worker.Run(ctx)
			})
		}
	}

	if workersStarted == 0 {
		log.Println("no workers enabled")
		<-ctx.Done()
		return ctx.Err()
	}

	return group.Wait()
}
