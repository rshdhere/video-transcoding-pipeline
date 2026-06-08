## Architecture

![Video transcoding pipeline architecture](docs/video_transcoding_pipeline_architecture.svg)

The pipeline uploads raw video to S3, transcodes in Go workers via SQS, and serves processed assets through **CloudFront**:

- **S3 HLS** — workers write adaptive streams (`master.m3u8` + `.ts` segments) per resolution under `hls/{videoId}/`
- **S3 thumbnails** — workers extract the frame at **00:00:05** and store `thumbnails/{videoId}/poster.jpg`
- **CloudFront CDN** — playback and poster URLs point at the distribution origin (OAC to S3); raw uploads remain presigned PUT direct to S3

Full design (storage layout, ffmpeg commands, API contracts, CloudFormation checklist): [`docs/architecture.md`](docs/architecture.md).

Infrastructure (S3 buckets, CloudFront, OAC, Route 53) is provisioned in the dedicated CloudFormation repository, not in this repo.

## Workspace

- `apps/web`: starter Next.js application
- `apps/workers`: background workers (Go) — transcode and email
- `apps/server`: starter Bun server application
- `packages/ui`: shared React UI package
- `packages/eslint-config`: shared ESLint configuration
- `packages/typescript-config`: shared TypeScript configuration
- `docs/`: project-level documentation — [`architecture.md`](docs/architecture.md) and the diagram above

`apps/docs` is the generated documentation app. Root `docs/` is reserved for static project documentation assets.

## Commands

```sh
bun run dev
bun run build
bun run lint
bun run check-types
bun run format
```

## Notes

- Dependencies were installed during scaffolding, so the workspace is ready to run.
- The starter apps are intact and can now be replaced with the actual video transcoding pipeline services and documentation.
