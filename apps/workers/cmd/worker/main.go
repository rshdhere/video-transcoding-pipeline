package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/config"
	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/runner"
)

func main() {
	config.LoadEnvFiles()
	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	r := runner.New(cfg)

	log.Printf("workers starting (transcode=%t email=%t)", cfg.TranscodeEnabled, cfg.EmailEnabled)
	if err := r.Run(ctx); err != nil && err != context.Canceled {
		log.Fatalf("workers: %v", err)
	}

	log.Println("workers stopped")
	os.Exit(0)
}
