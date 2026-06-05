package config

import (
	"os"
	"strconv"
)

type Config struct {
	TranscodeEnabled bool
	EmailEnabled     bool
}

func Load() Config {
	return Config{
		TranscodeEnabled: envBool("WORKERS_TRANSCODE_ENABLED", true),
		EmailEnabled:     envBool("WORKERS_EMAIL_ENABLED", true),
	}
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
