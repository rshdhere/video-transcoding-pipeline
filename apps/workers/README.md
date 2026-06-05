# Workers (Go)

Background workers for the video transcoding pipeline, implemented in Go.

## Run

```bash
# from repo root
bun run dev --filter=@vtp/workers

# or from this directory
go run ./cmd/worker
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKERS_TRANSCODE_ENABLED` | `true` | Enable the transcode worker |
| `WORKERS_EMAIL_ENABLED` | `true` | Enable the email worker |

## Build

```bash
go build -o bin/worker ./cmd/worker
```
