"use client";

import { useCallback, useEffect, useState } from "react";

import { listVideos } from "@/lib/api";
import type { Video } from "@/lib/types";
import { AuthGuard } from "@/components/auth-guard";
import { UploadForm } from "@/components/upload-form";
import { VideosTable } from "@/components/videos-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshVideos = useCallback(async () => {
    setError(null);

    try {
      const response = await listVideos();
      setVideos(response.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshVideos();
  }, [refreshVideos]);

  useEffect(() => {
    const hasActiveJobs = videos.some(
      (video) => video.status === "uploaded" || video.status === "processing",
    );

    if (!hasActiveJobs) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshVideos();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [refreshVideos, videos]);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Upload videos and track transcoding progress.
          </p>
        </div>

        <UploadForm onUploaded={refreshVideos} />

        <section className="space-y-4">
          <h2 className="text-xl font-medium">Your videos</h2>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  void refreshVideos();
                }}
              >
                Retry
              </Button>
            </div>
          ) : (
            <VideosTable videos={videos} />
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
