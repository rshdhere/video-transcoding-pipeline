package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// LoadEnvFiles loads a local .env file when present.
// Existing environment variables are not overwritten.
func LoadEnvFiles() {
	for _, path := range envFileCandidates() {
		if _, err := os.Stat(path); err != nil {
			continue
		}

		_ = godotenv.Load(path)
		clearEmptyAWSCredentials()
		return
	}
}

func clearEmptyAWSCredentials() {
	for _, key := range []string{
		"AWS_ACCESS_KEY_ID",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_SESSION_TOKEN",
	} {
		value, ok := os.LookupEnv(key)
		if ok && strings.TrimSpace(value) == "" {
			_ = os.Unsetenv(key)
		}
	}
}

func envFileCandidates() []string {
	return []string{
		".env",
		"apps/workers/.env",
	}
}
