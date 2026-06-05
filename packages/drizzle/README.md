# Drizzle

Database schema and migrations for the video transcoding pipeline.

## Schema

- `auth` tables: users, sessions, accounts, verification
- `videos`: uploaded source files (`video/mp4`, `video/webm`)
- `video_variants`: transcoded outputs per resolution (`480p`, `720p`, `1080p`)
- `video_downloads`: download audit, idempotency, and daily rate-limit tracking
- `background_jobs`: queue job state with JSON payloads for transcoding and email verification

## Commands

From the repo root:

```bash
bun run db:generate
bun run db:migrate
```

From this package:

```bash
bun run db:generate
bun run db:migrate
bun run db:push
```

Set `DATABASE_URL` before running migrations.
