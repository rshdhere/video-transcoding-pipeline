import type {
  ApiError,
  Resolution,
  Video,
  VideoVariant,
} from "@/lib/types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }

  return body;
}

export async function listVideos() {
  return apiFetch<{ videos: Video[] }>("/api/v1/videos");
}

export async function uploadVideo(input: {
  fileName: string;
  mimeType: "video/mp4" | "video/webm";
  fileSizeBytes: number;
}) {
  return apiFetch<{ video: Video; uploadUrl: string }>("/api/v1/videos/upload", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function confirmVideoUpload(videoId: string) {
  return apiFetch<{ video: Video }>(
    `/api/v1/videos/${videoId}/confirm-upload`,
    {
      method: "POST",
    },
  );
}

export async function importYouTubeVideo(url: string) {
  return apiFetch<{ video: Video }>("/api/v1/videos/import", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function getVideoVariants(videoId: string) {
  return apiFetch<{ variants: VideoVariant[]; thumbnailUrl: string | null }>(
    `/api/v1/videos/${videoId}/variants`,
  );
}

export async function downloadVariant(
  videoId: string,
  resolution: Resolution,
  idempotencyKey?: string,
) {
  return apiFetch<{
    downloadUrl: string;
    variant: VideoVariant;
    deduplicated?: boolean;
  }>(`/api/v1/videos/${videoId}/download`, {
    method: "POST",
    body: JSON.stringify({
      resolution,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    }),
  });
}

export async function putFileToUploadUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }

      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}
