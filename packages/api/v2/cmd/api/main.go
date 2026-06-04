package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rshdhere/video-transcoding-pipeline/packages/api/v2/internal/config"
	"github.com/rshdhere/video-transcoding-pipeline/packages/api/v2/internal/server"
)

func main() {
	cfg := config.Load()

	srv := server.New(cfg)

	go func() {
		log.Printf("api v2 listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && err != server.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown: %v", err)
	}
}
