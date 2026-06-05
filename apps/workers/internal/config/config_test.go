package config

import "testing"

func TestLoadUsesDefaults(t *testing.T) {
	t.Setenv("WORKERS_TRANSCODE_ENABLED", "false")
	t.Setenv("WORKERS_EMAIL_ENABLED", "true")

	cfg := Load()

	if cfg.TranscodeEnabled {
		t.Fatalf("expected transcode worker to be disabled")
	}

	if !cfg.EmailEnabled {
		t.Fatalf("expected email worker to be enabled")
	}

	if len(cfg.TranscodingResolutions) != 3 {
		t.Fatalf("expected default resolutions, got %#v", cfg.TranscodingResolutions)
	}
}

func TestEnvCSV(t *testing.T) {
	t.Setenv("TRANSCODING_RESOLUTIONS", "480p, 720p")

	cfg := Load()

	if len(cfg.TranscodingResolutions) != 2 {
		t.Fatalf("expected parsed resolutions, got %#v", cfg.TranscodingResolutions)
	}
}
