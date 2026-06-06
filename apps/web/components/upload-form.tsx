"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  confirmVideoUpload,
  putFileToUploadUrl,
  uploadVideo,
} from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

const MAX_FILE_SIZE_BYTES = 500_000_000;

const ALLOWED_TYPES = {
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
} as const;

type AllowedMimeType = keyof typeof ALLOWED_TYPES;

function isAllowedMimeType(value: string): value is AllowedMimeType {
  return value in ALLOWED_TYPES;
}

export function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setProgress(0);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose a video file to upload.");
      return;
    }

    if (!isAllowedMimeType(file.type)) {
      setError("Only MP4 and WebM files are supported.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Files must be 500 MB or smaller.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { video, uploadUrl } = await uploadVideo({
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
      });

      if (uploadUrl.startsWith("s3://")) {
        toast.warning(
          "Upload slot reserved. Enable AWS_ENABLED on the API server to upload to S3.",
        );
      } else {
        await putFileToUploadUrl(uploadUrl, file, setProgress);
        await confirmVideoUpload(video.id);
        toast.success("Video uploaded. Transcoding has been queued.");
      }

      setFile(null);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      onUploaded();

      window.location.href = `/videos/${video.id}`;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="size-5" />
          Upload video
        </CardTitle>
        <CardDescription>
          MP4 or WebM up to 500 MB. One upload every 30 seconds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="video-file">Video file</Label>
            <Input
              ref={inputRef}
              id="video-file"
              type="file"
              accept=".mp4,.webm,video/mp4,video/webm"
              onChange={handleFileChange}
              disabled={loading}
            />
            {file ? (
              <p className="text-sm text-muted-foreground">
                {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            ) : null}
          </div>

          {progress > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Uploading to storage</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          ) : null}

          <Button type="submit" disabled={loading || !file}>
            {loading ? "Uploading..." : "Upload and transcode"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
