package server

import (
	"context"
	"errors"
	"net/http"

	"github.com/rshdhere/video-transcoding-pipeline/packages/api/v2/internal/config"
	"github.com/rshdhere/video-transcoding-pipeline/packages/api/v2/internal/handler"
)

var ErrServerClosed = http.ErrServerClosed

type Server struct {
	httpServer *http.Server
}

func New(cfg config.Config) *Server {
	mux := http.NewServeMux()

	health := handler.NewHealth()
	mux.HandleFunc("GET /health", health.ServeHTTP)
	mux.HandleFunc("GET /api/v2/health", health.ServeHTTP)

	api := handler.NewAPI()
	mux.HandleFunc("GET /api/v2", api.Root)
	mux.HandleFunc("GET /api/v2/", api.Root)

	return &Server{
		httpServer: &http.Server{
			Addr:    cfg.Addr,
			Handler: mux,
		},
	}
}

func (s *Server) ListenAndServe() error {
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	if err := s.httpServer.Shutdown(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
