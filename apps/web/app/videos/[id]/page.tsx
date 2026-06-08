"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";

import { getVideoVariants, listVideos } from "@/lib/api";
import type { Video, VideoVariant } from "@/lib/types";
import { AuthGuard } from "@/components/auth-guard";
import { VariantPlayers } from "@/components/variant-players";
import { VideoStatusBadge } from "@/components/video-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [video, setVideo] = useState<Video | null>(null);
  const [variants, setVariants] = useState<VideoVariant[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const [videosResponse, variantsResponse] = await Promise.all([
        listVideos(),
        getVideoVariants(id),
      ]);

      const currentVideo =
        videosResponse.videos.find((item) => item.id === id) ?? null;

      if (!currentVideo) {
        setError("Video not found or you do not have access.");
        return;
      }

      setVideo(currentVideo);
      setVariants(variantsResponse.variants);
      setThumbnailUrl(variantsResponse.thumbnailUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const hasActiveWork =
      video &&
      (video.status === "uploaded" ||
        video.status === "processing" ||
        variants.some(
          (variant) =>
            variant.status === "pending" || variant.status === "processing",
        ));

    if (!hasActiveWork) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [refresh, variants, video]);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Button variant="ghost" asChild className="px-0">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : video ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="h-24 w-40 shrink-0 rounded-md object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {video.originalFileName}
                  </h1>
                  <p className="mt-2 text-muted-foreground">
                    {formatBytes(video.fileSizeBytes)} · {video.mimeType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <VideoStatusBadge status={video.status} />
                <Button variant="outline" size="sm" onClick={() => void refresh()}>
                  <RefreshCw className="size-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transcoded variants</CardTitle>
                <CardDescription>
                  Stream adaptive HLS renditions from 480p through 4K, or play and
                  download the MP3 audio extract once they are ready.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VariantPlayers
                  videoId={video.id}
                  variants={variants}
                  thumbnailUrl={thumbnailUrl}
                />
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AuthGuard>
  );
}
