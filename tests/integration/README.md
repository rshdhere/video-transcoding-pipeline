# Integration Tests

End-to-end integration tests for the video transcoding pipeline API.

## Structure

```text
tests/integration/
  src/
    setup.ts              # env loading and shared test config
    schema.ts             # shared test constants and resolution schema
    helpers/
      auth.ts             # auth helpers for authenticated test sessions
    auth/
      auth.integration.ts
    download/
      download.integration.ts
    queue/
      queue.integration.ts
    upload/
      upload.integration.ts
    worker/
      worker.integration.ts
  vitest.config.ts
```

## Setup

```bash
bun install
```

## Run

```bash
bun run test
```

Or from the repo root:

```bash
bun run test:integration
```
