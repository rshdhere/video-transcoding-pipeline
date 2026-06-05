# @vtp/aws

AWS S3 helpers for the video transcoding pipeline.

## Features

- S3 client factory with optional LocalStack endpoint support
- Presigned PUT URLs for raw video uploads
- Presigned GET URLs for transcoded video downloads

## Usage

```ts
import {
  createDownloadPresignedUrl,
  createS3Client,
  createUploadPresignedUrl,
} from "@vtp/aws";
```

Set `AWS_ENABLED=true` in the server environment to activate presigned URLs in the API layer.
