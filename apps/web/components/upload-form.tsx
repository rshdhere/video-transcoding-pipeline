"use client";

import { Link2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  confirmVideoUpload,
  importYouTubeVideo,
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
type ImportMode = "file" | "youtube";

function isAllowedMimeType(value: string): value is AllowedMimeType {
  return value in ALLOWED_TYPES;
}

export function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleModeChange(nextMode: ImportMode) {
    setMode(nextMode);
    setError(null);
    setProgress(0);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setProgress(0);
  }

  async function handleFileSubmit(event: React.FormEvent<HTMLFormElement>) {
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

  async function handleYouTubeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUrl = youtubeUrl.trim();
    if (!trimmedUrl) {
      setError("Enter a YouTube video URL.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { video } = await importYouTubeVideo(trimmedUrl);
      toast.success("YouTube import queued. Download and transcoding will run in the background.");
      setYoutubeUrl("");
      onUploaded();
      window.location.href = `/videos/${video.id}`;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Import failed. Try again.";
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
          {mode === "file" ? (
            <Upload className="size-5" />
          ) : (
            <Link2 className="size-5" />
          )}
          {mode === "file" ? "Upload video" : "Import from YouTube"}
        </CardTitle>
        <CardDescription>
          {mode === "file"
            ? "MP4 or WebM up to 500 MB. One upload every 30 seconds."
            : "Paste a YouTube link. The worker downloads it with yt-dlp, stores it in uploads, then transcodes."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "file" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("file")}
            disabled={loading}
          >
            Upload file
          </Button>
          <Button
            type="button"
            variant={mode === "youtube" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("youtube")}
            disabled={loading}
          >
            YouTube URL
          </Button>
        </div>

        {mode === "file" ? (
          <form key="file-upload" onSubmit={handleFileSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="video-file">Video file</Label>
              <Input
                key="video-file"
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
        ) : (
          <form key="youtube-import" onSubmit={handleYouTubeSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                key="youtube-url"
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl ?? ""}
                onChange={(event) => {
                  setYoutubeUrl(event.target.value);
                  setError(null);
                }}
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading || !youtubeUrl.trim()}>
              {loading ? "Queuing import..." : "Import and transcode"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
