package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	TranscodeEnabled bool
	EmailEnabled     bool
	WorkerID         string

	DatabaseURL string

	AWSRegion          string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	S3Endpoint         string
	S3ForcePathStyle   bool
	S3UploadBucket     string
	S3TranscodedBucket string
	SQSEndpoint        string
	SQSTranscodeURL    string
	SQSEmailURL        string

	TranscodingResolutions []string
	FFmpegPath             string
	YtDlpPath              string
	ThumbnailSeekSeconds   float64
	TempDir                string
	MaxConcurrentPolls     int

	ResendAPIKey   string
	ResendFrom     string
	MailEnabled    bool
	VerificationURL string
}

func Load() Config {
	return Config{
		TranscodeEnabled: envBool("WORKERS_TRANSCODE_ENABLED", true),
		EmailEnabled:     envBool("WORKERS_EMAIL_ENABLED", true),
		WorkerID:         envString("WORKERS_ID", hostnameOrDefault()),

		DatabaseURL: envString("DATABASE_URL", "postgresql://vtp:vtp@localhost:5432/vtp"),

		AWSRegion:          envString("AWS_REGION", "us-east-1"),
		AWSAccessKeyID:     envString("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey: envString("AWS_SECRET_ACCESS_KEY", ""),
		S3Endpoint:         envString("S3_ENDPOINT", ""),
		S3ForcePathStyle:   envBool("S3_FORCE_PATH_STYLE", false),
		S3UploadBucket:     envString("S3_UPLOAD_BUCKET", "vtp-uploads"),
		S3TranscodedBucket: envString("S3_TRANSCODED_BUCKET", "vtp-transcoded"),
		SQSEndpoint:        envString("SQS_ENDPOINT", ""),
		SQSTranscodeURL:    envString("SQS_TRANSCODING_QUEUE_URL", ""),
		SQSEmailURL:        envString("SQS_EMAIL_VERIFICATION_QUEUE_URL", ""),

		TranscodingResolutions: envCSV("TRANSCODING_RESOLUTIONS", []string{"480p", "720p", "1080p", "2160p", "mp3"}),
		FFmpegPath:             envString("FFMPEG_PATH", "ffmpeg"),
		YtDlpPath:              envString("YTDLP_PATH", "yt-dlp"),
		ThumbnailSeekSeconds:   envFloat("THUMBNAIL_SEEK_SECONDS", 5),
		TempDir:                envString("WORKERS_TEMP_DIR", ""),
		MaxConcurrentPolls:     envInt("WORKERS_MAX_CONCURRENT_POLLS", 3),

		ResendAPIKey:    envString("RESEND_API_KEY", ""),
		ResendFrom:      envString("RESEND_FROM_EMAIL", "noreply@mail.raashed.cloud"),
		MailEnabled:     envBool("MAIL_ENABLED", false),
		VerificationURL: envString("WORKERS_VERIFICATION_URL", "http://localhost:3001/api/v1/auth/verify-email"),
	}
}

func envString(key, fallback string) string {
	value, ok := os.LookupEnv(key)
	if !ok || value == "" {
		return fallback
	}

	return value
}

func envBool(key string, fallback bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func envInt(key string, fallback int) int {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func envFloat(key string, fallback float64) float64 {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return fallback
	}

	return parsed
}

func envCSV(key string, fallback []string) []string {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		return fallback
	}

	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}

	if len(result) == 0 {
		return fallback
	}

	return result
}

func hostnameOrDefault() string {
	hostname, err := os.Hostname()
	if err != nil || hostname == "" {
		return "worker"
	}

	return hostname
}
