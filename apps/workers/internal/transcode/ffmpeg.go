package transcode

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
)

var resolutionHeights = map[string]int{
	"480p":  480,
	"720p":  720,
	"1080p": 1080,
}

func Transcode(ctx context.Context, ffmpegPath, inputPath, outputPath, resolution string) error {
	height, ok := resolutionHeights[resolution]
	if !ok {
		return fmt.Errorf("unsupported resolution: %s", resolution)
	}

	args := []string{
		"-y",
		"-i", inputPath,
		"-vf", fmt.Sprintf("scale=-2:%d", height),
		"-c:v", "libx264",
		"-preset", "fast",
		"-c:a", "aac",
		"-movflags", "+faststart",
		outputPath,
	}

	cmd := exec.CommandContext(ctx, ffmpegPath, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg failed: %w (%s)", err, strings.TrimSpace(string(output)))
	}

	return nil
}

func ValidateFFmpeg(ctx context.Context, ffmpegPath string) error {
	cmd := exec.CommandContext(ctx, ffmpegPath, "-version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg unavailable at %s: %w", ffmpegPath, err)
	}

	if !strings.Contains(string(output), "ffmpeg version") {
		return fmt.Errorf("unexpected ffmpeg output")
	}

	return nil
}
