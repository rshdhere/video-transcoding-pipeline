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

function embedIdempotencyKey(videoId: string, resolution: Resolution) {
  return `embed-${videoId}-${resolution}`;
}

function resolutionLabel(resolution: Resolution): string {
  if (resolution === "2160p") {
    return "4K";
  }

  if (resolution === "mp3") {
    return "MP3";
  }

  return resolution;
}

function VariantMedia({
  resolution,
  streamUrl,
  isAudio,
}: {
  resolution: Resolution;
  streamUrl: string;
  isAudio: boolean;
}) {
  return (
    <div className="space-y-3">
      {isAudio ? (
        <audio controls preload="metadata" className="w-full" src={streamUrl}>
          Your browser does not support embedded audio playback.
        </audio>
      ) : (
        <video
          controls
          preload="metadata"
          playsInline
          className="aspect-video w-full rounded-md bg-black"
          src={streamUrl}
        >
          Your browser does not support embedded video playback.
        </video>
      )}
      <Button variant="outline" size="sm" asChild>
        <a href={streamUrl} target="_blank" rel="noopener noreferrer">
          <Download className="size-4" />
          Download {resolutionLabel(resolution)}
        </a>
      </Button>
    </div>
  );
}

function VariantCard({
  resolution,
  variant,
  streamUrl,
  isLoading,
  error,
  isAudio = false,
}: {
  resolution: Resolution;
  variant?: VideoVariant;
  streamUrl?: string;
  isLoading?: boolean;
  error?: string;
  isAudio?: boolean;
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
          isLoading ? (
            isAudio ? (
              <Skeleton className="h-12 w-full rounded-md" />
            ) : (
              <Skeleton className="aspect-video w-full rounded-md" />
            )
          ) : error ? (
            <div
              className={
                isAudio
                  ? "flex h-24 items-center justify-center rounded-md bg-muted px-4 text-center text-sm text-muted-foreground"
                  : "flex aspect-video items-center justify-center rounded-md bg-muted px-4 text-center text-sm text-muted-foreground"
              }
            >
              {error}
            </div>
          ) : streamUrl ? (
            <VariantMedia
              resolution={resolution}
              streamUrl={streamUrl}
              isAudio={isAudio}
            />
          ) : null
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
}: {
  videoId: string;
  variants: VideoVariant[];
}) {
  const [streamUrls, setStreamUrls] = useState<
    Partial<Record<Resolution, string>>
  >({});
  const [loading, setLoading] = useState<Partial<Record<Resolution, boolean>>>(
    {},
  );
  const [errors, setErrors] = useState<Partial<Record<Resolution, string>>>(
    {},
  );
  const fetchedRef = useRef<Set<Resolution>>(new Set());

  useEffect(() => {
    const readyVariants = variants.filter((variant) => variant.status === "ready");

    for (const variant of readyVariants) {
      const resolution = variant.resolution;

      if (fetchedRef.current.has(resolution)) {
        continue;
      }

      fetchedRef.current.add(resolution);
      setLoading((previous) => ({ ...previous, [resolution]: true }));

      void downloadVariant(
        videoId,
        resolution,
        embedIdempotencyKey(videoId, resolution),
      )
        .then(({ downloadUrl }) => {
          if (downloadUrl.startsWith("s3://")) {
            setErrors((previous) => ({
              ...previous,
              [resolution]:
                "Streaming unavailable. Enable AWS_ENABLED on the API server.",
            }));
            return;
          }

          setStreamUrls((previous) => ({
            ...previous,
            [resolution]: downloadUrl,
          }));
        })
        .catch((err) => {
          setErrors((previous) => ({
            ...previous,
            [resolution]:
              err instanceof Error ? err.message : "Failed to load media",
          }));
        })
        .finally(() => {
          setLoading((previous) => ({ ...previous, [resolution]: false }));
        });
    }
  }, [videoId, variants]);

  return (
    <div className="space-y-6">
      {VIDEO_RESOLUTIONS.map((resolution) => (
        <VariantCard
          key={resolution}
          resolution={resolution}
          variant={variants.find((item) => item.resolution === resolution)}
          streamUrl={streamUrls[resolution]}
          isLoading={loading[resolution]}
          error={errors[resolution]}
        />
      ))}

      <VariantCard
        resolution={AUDIO_RESOLUTION}
        variant={variants.find((item) => item.resolution === AUDIO_RESOLUTION)}
        streamUrl={streamUrls[AUDIO_RESOLUTION]}
        isLoading={loading[AUDIO_RESOLUTION]}
        error={errors[AUDIO_RESOLUTION]}
        isAudio
      />
    </div>
  );
}
