# API v2 (Go)

HTTP API for the video transcoding pipeline, implemented in Go.

## Run

```bash
# from repo root
bun run dev --filter=@vtp/api-v2

# or from this directory
go run ./cmd/api
```

Set `API_V2_ADDR` to override the listen address (default `:8080`).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/api/v2/health` | Liveness check (versioned) |
| GET | `/api/v2/` | API root |

## Build

```bash
go build -o bin/api ./cmd/api
```
