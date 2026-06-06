# API v1

Express HTTP API for the video transcoding pipeline.

## Run

From the repo root:

```bash
bun run dev
```

Or start the server app directly:

```bash
bun run start --filter=@vtp/server
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| ALL | `/api/v1/auth/*` | Public | Better Auth (sign-up, sign-in, sign-out, session) |
| GET | `/health` | Public | Liveness check |
| GET | `/api/v1/me` | Session | Current user and session |
| GET | `/api/v1/videos` | Session | List videos for the current user |
| POST | `/api/v1/videos/upload` | Session | Create upload and enqueue transcoding |
| POST | `/api/v1/videos/:videoId/download` | Session | Download a transcoded variant |
| GET | `/api/v1/videos/:videoId/variants` | Session | List variants for an owned video |
| POST | `/api/v1/queue/push` | Optional | Enqueue a background job |
| POST | `/api/v1/queue/pop` | Session | Pop a transcoding job for the current user |
| POST | `/api/v1/workers/process` | Optional | Process the next queued job |
| POST | `/api/v1/workers/shutdown` | Session | Gracefully shut down a worker type |

## Structure

```text
packages/api/v1/src/
  app.ts              # Express app factory
  index.ts            # startServer helper
  routes/
    auth.ts           # Better Auth mount (before JSON parser)
    health.ts
    me.ts
    videos.ts
    queue.ts
    workers.ts
```

Business logic lives in `@vtp/handlers`. Route modules here only wire HTTP paths to handler factories.

## Tests

Integration coverage for every endpoint above:

```bash
bun run test:integration
```
