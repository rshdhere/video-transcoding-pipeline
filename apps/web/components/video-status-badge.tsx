import { Loader2 } from "lucide-react";

import type { VideoStatus, VariantStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const videoStatusVariant: Record<
  VideoStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  uploaded: "secondary",
  processing: "default",
  completed: "outline",
  failed: "destructive",
};

const variantStatusVariant: Record<
  VariantStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  processing: "default",
  ready: "outline",
  failed: "destructive",
};

function StatusLabel({
  status,
  variant,
}: {
  status: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}) {
  const isProcessing = status === "processing";

  return (
    <Badge variant={variant} className="gap-1 capitalize">
      {isProcessing ? <Loader2 className="size-3 animate-spin" /> : null}
      {status}
    </Badge>
  );
}

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  return <StatusLabel status={status} variant={videoStatusVariant[status]} />;
}

export function VariantStatusBadge({ status }: { status: VariantStatus }) {
  return <StatusLabel status={status} variant={variantStatusVariant[status]} />;
}
