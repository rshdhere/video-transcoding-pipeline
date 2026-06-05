package runner

import (
	"context"
	"log"

	"github.com/rshdhere/video-transcoding-pipeline/apps/workers/internal/config"
)

type Runner struct {
	cfg config.Config
}

func New(cfg config.Config) *Runner {
	return &Runner{cfg: cfg}
}

func (r *Runner) Run(ctx context.Context) error {
	if r.cfg.TranscodeEnabled {
		log.Println("transcode worker ready")
	}

	if r.cfg.EmailEnabled {
		log.Println("email worker ready")
	}

	if !r.cfg.TranscodeEnabled && !r.cfg.EmailEnabled {
		log.Println("no workers enabled")
	}

	<-ctx.Done()
	return ctx.Err()
}
