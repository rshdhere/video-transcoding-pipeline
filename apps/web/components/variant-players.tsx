"use client";

import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { downloadVariant } from "@/lib/api";
import type { Resolution, VideoVariant } from "@/lib/types";
import { VariantStatusBadge } from "@/components/video-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const VIDEO_RESOLUTIONS: Resolution[] = ["480p", "720p", "1080p", "2160p"];
const AUDIO_RESOLUTION: Resolution = "mp3";

function resolutionLabel(resolution: Resolution): string {
  if (resolution === "2160p") {
    return "4K";
  }

  if (resolution === "mp3") {
    return "MP3";
  }

  return resolution;
}

function isHlsStream(variant: VideoVariant) {
  return (
    variant.mimeType === "application/vnd.apple.mpegurl" ||
    variant.s3Key.endsWith(".m3u8")
  );
}

function HlsVideoPlayer({
  src,
  poster,
}: {
  src: string;
  poster?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let hls: { destroy: () => void } | null = null;
    let cancelled = false;

    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !video) {
        return;
      }

      if (Hls.isSupported()) {
        const player = new Hls();
        player.loadSource(src);
        player.attachMedia(video);
        hls = player;
        return;
      }

      video.src = src;
    });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      playsInline
      poster={poster ?? undefined}
      className="aspect-video w-full rounded-md bg-black"
    >
      Your browser does not support embedded video playback.
    </video>
  );
}

function VariantMedia({
  resolution,
  variant,
  streamUrl,
  posterUrl,
  isAudio,
  onDownload,
  downloading,
}: {
  resolution: Resolution;
  variant: VideoVariant;
  streamUrl: string;
  posterUrl?: string | null;
  isAudio: boolean;
  onDownload: () => void;
  downloading: boolean;
}) {
  return (
    <div className="space-y-3">
      {isAudio ? (
        <audio controls preload="metadata" className="w-full" src={streamUrl}>
          Your browser does not support embedded audio playback.
        </audio>
      ) : isHlsStream(variant) ? (
        <HlsVideoPlayer src={streamUrl} poster={posterUrl} />
      ) : (
        <video
          controls
          preload="metadata"
          playsInline
          poster={posterUrl ?? undefined}
          className="aspect-video w-full rounded-md bg-black"
          src={streamUrl}
        >
          Your browser does not support embedded video playback.
        </video>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onDownload}
        disabled={downloading}
      >
        <Download className="size-4" />
        {downloading ? "Preparing download..." : `Download ${resolutionLabel(resolution)}`}
      </Button>
    </div>
  );
}

function VariantCard({
  resolution,
  variant,
  streamUrl,
  posterUrl,
  error,
  isAudio = false,
  onDownload,
  downloading,
}: {
  resolution: Resolution;
  variant?: VideoVariant;
  streamUrl?: string | null;
  posterUrl?: string | null;
  error?: string;
  isAudio?: boolean;
  onDownload: () => void;
  downloading: boolean;
}) {
  const ready = variant?.status === "ready";

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-medium">{resolutionLabel(resolution)}</span>
        {variant ? (
          <VariantStatusBadge status={variant.status} />
        ) : (
          <VariantStatusBadge status="pending" />
        )}
      </div>

      <div className="p-4">
        {ready ? (
          error ? (
            <div
              className={
                isAudio
                  ? "flex h-24 items-center justify-center rounded-md bg-muted px-4 text-center text-sm text-muted-foreground"
                  : "flex aspect-video items-center justify-center rounded-md bg-muted px-4 text-center text-sm text-muted-foreground"
              }
            >
              {error}
            </div>
          ) : !streamUrl ? (
            <Skeleton
              className={
                isAudio ? "h-12 w-full rounded-md" : "aspect-video w-full rounded-md"
              }
            />
          ) : streamUrl.startsWith("s3://") ? (
            <div
              className={
                isAudio
                  ? "flex h-24 items-center justify-center rounded-md bg-muted px-4 text-center text-sm text-muted-foreground"
                  : "flex aspect-video items-center justify-center rounded-md bg-muted px-4 text-center text-sm text-muted-foreground"
              }
            >
              Streaming unavailable. Enable AWS_ENABLED or CLOUDFRONT_DOMAIN on
              the API server.
            </div>
          ) : (
            <VariantMedia
              resolution={resolution}
              variant={variant!}
              streamUrl={streamUrl}
              posterUrl={posterUrl}
              isAudio={isAudio}
              onDownload={onDownload}
              downloading={downloading}
            />
          )
        ) : (
          <div
            className={
              isAudio
                ? "flex h-24 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground"
                : "flex aspect-video items-center justify-center rounded-md bg-muted text-sm text-muted-foreground"
            }
          >
            {variant?.status === "processing"
              ? "Transcoding in progress..."
              : variant?.status === "failed"
                ? "Transcoding failed for this format."
                : "Waiting for transcoding to start..."}
          </div>
        )}
      </div>
    </div>
  );
}

export function VariantPlayers({
  videoId,
  variants,
  thumbnailUrl,
}: {
  videoId: string;
  variants: VideoVariant[];
  thumbnailUrl?: string | null;
}) {
  const [downloadErrors, setDownloadErrors] = useState<
    Partial<Record<Resolution, string>>
  >({});
  const [downloading, setDownloading] = useState<
    Partial<Record<Resolution, boolean>>
  >({});

  async function handleDownload(resolution: Resolution) {
    setDownloading((previous) => ({ ...previous, [resolution]: true }));
    setDownloadErrors((previous) => ({ ...previous, [resolution]: undefined }));

    try {
      const { downloadUrl } = await downloadVariant(
        videoId,
        resolution,
        `download-${videoId}-${resolution}-${Date.now()}`,
      );

      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setDownloadErrors((previous) => ({
        ...previous,
        [resolution]:
          err instanceof Error ? err.message : "Failed to prepare download",
      }));
    } finally {
      setDownloading((previous) => ({ ...previous, [resolution]: false }));
    }
  }

  return (
    <div className="space-y-6">
      {VIDEO_RESOLUTIONS.map((resolution) => {
        const variant = variants.find((item) => item.resolution === resolution);

        return (
          <VariantCard
            key={resolution}
            resolution={resolution}
            variant={variant}
            streamUrl={variant?.streamUrl}
            posterUrl={thumbnailUrl}
            error={downloadErrors[resolution]}
            onDownload={() => void handleDownload(resolution)}
            downloading={Boolean(downloading[resolution])}
          />
        );
      })}

      <VariantCard
        resolution={AUDIO_RESOLUTION}
        variant={variants.find((item) => item.resolution === AUDIO_RESOLUTION)}
        streamUrl={
          variants.find((item) => item.resolution === AUDIO_RESOLUTION)?.streamUrl
        }
        error={downloadErrors[AUDIO_RESOLUTION]}
        isAudio
        onDownload={() => void handleDownload(AUDIO_RESOLUTION)}
        downloading={Boolean(downloading[AUDIO_RESOLUTION])}
      />
    </div>
  );
}
