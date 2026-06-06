"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { downloadVariant } from "@/lib/api";
import type { Resolution, VideoVariant } from "@/lib/types";
import { VariantStatusBadge } from "@/components/video-status-badge";
import { Button } from "@/components/ui/button";

const RESOLUTIONS: Resolution[] = ["480p", "720p", "1080p"];

export function VariantDownloadButtons({
  videoId,
  variants,
}: {
  videoId: string;
  variants: VideoVariant[];
}) {
  const [loadingResolution, setLoadingResolution] = useState<Resolution | null>(
    null,
  );

  async function handleDownload(resolution: Resolution) {
    setLoadingResolution(resolution);

    try {
      const { downloadUrl } = await downloadVariant(
        videoId,
        resolution,
        crypto.randomUUID(),
      );

      if (downloadUrl.startsWith("s3://")) {
        toast.warning(
          "Download URL unavailable. Enable AWS_ENABLED on the API server.",
        );
        return;
      }

      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      toast.success(`Download started for ${resolution}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Download failed. Try again.",
      );
    } finally {
      setLoadingResolution(null);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {RESOLUTIONS.map((resolution) => {
        const variant = variants.find((item) => item.resolution === resolution);
        const ready = variant?.status === "ready";

        return (
          <div
            key={resolution}
            className="flex flex-col gap-3 rounded-lg border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{resolution}</span>
              {variant ? (
                <VariantStatusBadge status={variant.status} />
              ) : (
                <VariantStatusBadge status="pending" />
              )}
            </div>
            <Button
              variant="outline"
              disabled={!ready || loadingResolution === resolution}
              onClick={() => handleDownload(resolution)}
            >
              <Download className="size-4" />
              {loadingResolution === resolution ? "Preparing..." : "Download"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
