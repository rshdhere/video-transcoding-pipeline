package transcode

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
)

func DownloadYouTube(
	ctx context.Context,
	ytdlpPath string,
	url string,
	outputPath string,
) error {
	args := []string{
		"--no-playlist",
		"-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
		"--merge-output-format", "mp4",
		"-o", outputPath,
		url,
	}

	cmd := exec.CommandContext(ctx, ytdlpPath, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("yt-dlp failed: %w (%s)", err, strings.TrimSpace(string(output)))
	}

	return nil
}

func ValidateYtDlp(ctx context.Context, ytdlpPath string) error {
	cmd := exec.CommandContext(ctx, ytdlpPath, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("yt-dlp unavailable at %s: %w", ytdlpPath, err)
	}

	if strings.TrimSpace(string(output)) == "" {
		return fmt.Errorf("unexpected yt-dlp output")
	}

	return nil
}
