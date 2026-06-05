package email

import (
	"context"
	"fmt"
	"log"

	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/config"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/queue"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/store"
)

type Worker struct {
	cfg    config.Config
	store  *store.Postgres
	queue  *queue.Client
	sender *Sender
	sema   chan struct{}
}

func NewWorker(
	cfg config.Config,
	store *store.Postgres,
	queueClient *queue.Client,
	sender *Sender,
) *Worker {
	return &Worker{
		cfg:    cfg,
		store:  store,
		queue:  queueClient,
		sender: sender,
		sema:   make(chan struct{}, cfg.MaxConcurrentPolls),
	}
}

func (w *Worker) Run(ctx context.Context) error {
	log.Printf("email worker listening on %s", w.cfg.SQSEmailURL)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			if err := w.processNext(ctx); err != nil {
				log.Printf("email worker error: %v", err)
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
		return err
	}
	if message == nil {
		return nil
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

	recipient, err := recipientFromPayload(message.Body.Payload)
	if err != nil {
		return w.failJob(ctx, record.ID, message.ReceiptHandle, err.Error())
	}

	verificationURL := w.cfg.VerificationURL
	if token, ok := message.Body.Payload["token"].(string); ok && token != "" {
		verificationURL = fmt.Sprintf("%s?token=%s", w.cfg.VerificationURL, token)
	}

	if err := w.sender.SendVerification(ctx, recipient, verificationURL); err != nil {
		return w.failJob(ctx, record.ID, message.ReceiptHandle, err.Error())
	}

	if err := w.store.CompleteJob(ctx, record.ID); err != nil {
		return err
	}

	return w.queue.Delete(ctx, message.ReceiptHandle)
}

func recipientFromPayload(payload map[string]interface{}) (string, error) {
	email, ok := payload["email"].(string)
	if !ok || email == "" {
		return "", fmt.Errorf("email_verification payload is missing email")
	}

	return email, nil
}

func (w *Worker) failJob(ctx context.Context, jobID, receiptHandle, message string) error {
	if err := w.store.FailJob(ctx, jobID, message); err != nil {
		return err
	}

	return w.queue.Delete(ctx, receiptHandle)
}
