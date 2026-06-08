package transcode

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

var resolutionHeights = map[string]int{
	"480p":  480,
	"720p":  720,
	"1080p": 1080,
	"2160p": 2160,
}

var resolutionBandwidth = map[string]int{
	"480p":  1400000,
	"720p":  2800000,
	"1080p": 5000000,
	"2160p": 12000000,
}

func TranscodeHLS(
	ctx context.Context,
	ffmpegPath,
	inputPath,
	outputDir,
	resolution string,
) error {
	height, ok := resolutionHeights[resolution]
	if !ok {
		return fmt.Errorf("unsupported resolution: %s", resolution)
	}

	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return err
	}

	playlistPath := filepath.Join(outputDir, "playlist.m3u8")
	segmentPattern := filepath.Join(outputDir, "segment_%03d.ts")

	args := []string{
		"-y",
		"-i", inputPath,
		"-vf", fmt.Sprintf("scale=-2:%d", height),
		"-c:v", "libx264",
		"-preset", "fast",
		"-profile:v", "main",
		"-c:a", "aac",
		"-b:a", "128k",
		"-hls_time", "6",
		"-hls_playlist_type", "vod",
		"-hls_segment_filename", segmentPattern,
		playlistPath,
	}

	cmd := exec.CommandContext(ctx, ffmpegPath, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg hls failed: %w (%s)", err, strings.TrimSpace(string(output)))
	}

	return nil
}

func WriteMasterPlaylist(outputPath string, resolutions []string) error {
	var builder strings.Builder
	builder.WriteString("#EXTM3U\n")
	builder.WriteString("#EXT-X-VERSION:3\n")

	for _, resolution := range resolutions {
		if resolution == "mp3" {
			continue
		}

		height, ok := resolutionHeights[resolution]
		if !ok {
			continue
		}

		width := height * 16 / 9
		if width%2 != 0 {
			width++
		}

		bandwidth, ok := resolutionBandwidth[resolution]
		if !ok {
			continue
		}

		builder.WriteString(fmt.Sprintf(
			"#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d\n",
			bandwidth,
			width,
			height,
		))
		builder.WriteString(fmt.Sprintf("%s/playlist.m3u8\n", resolution))
	}

	return os.WriteFile(outputPath, []byte(builder.String()), 0o644)
}

func ExtractThumbnail(
	ctx context.Context,
	ffmpegPath,
	inputPath,
	outputPath string,
	seekSeconds float64,
) error {
	args := []string{
		"-y",
		"-ss", fmt.Sprintf("%.3f", seekSeconds),
		"-i", inputPath,
		"-frames:v", "1",
		"-q:v", "2",
		outputPath,
	}

	cmd := exec.CommandContext(ctx, ffmpegPath, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg thumbnail failed: %w (%s)", err, strings.TrimSpace(string(output)))
	}

	return nil
}

func ExtractAudio(ctx context.Context, ffmpegPath, inputPath, outputPath string) error {
	args := []string{
		"-y",
		"-i", inputPath,
		"-vn",
		"-c:a", "libmp3lame",
		"-q:a", "2",
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

func DirectorySize(dir string) (int64, error) {
	var total int64

	err := filepath.WalkDir(dir, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if entry.IsDir() {
			return nil
		}

		info, err := entry.Info()
		if err != nil {
			return err
		}

		total += info.Size()
		return nil
	})

	return total, err
}
