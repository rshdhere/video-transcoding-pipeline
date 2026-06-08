# @vtp/aws

AWS helpers for the video transcoding pipeline.

## Features

- S3 client factory with optional LocalStack endpoint support
- Presigned PUT URLs for raw video uploads (direct to S3, not via CDN)
- Presigned GET URLs for local development fallback
- CloudFront URL builders for HLS manifests and thumbnails (target architecture)

## Delivery model

| Asset | Upload / write | Read in production |
|-------|----------------|-------------------|
| Raw source | Presigned PUT → `vtp-uploads` | Worker-only |
| HLS output | Worker PUT → `vtp-transcoded/hls/{videoId}/` | CloudFront `/hls/...` |
| Thumbnail | Worker PUT → `.../thumbnails/{videoId}/poster.jpg` | CloudFront `/thumbnails/...` |

See [`docs/architecture.md`](../../docs/architecture.md) for storage layout and CloudFormation handoff.

## Usage

```ts
import {
  createDownloadPresignedUrl,
  createS3Client,
  createUploadPresignedUrl,
} from "@vtp/aws";
```

Set `AWS_ENABLED=true` in the server environment to activate presigned upload URLs. Set `CLOUDFRONT_DOMAIN` (provisioned externally) so the API returns CDN URLs for playback assets instead of presigned GET URLs.
