# @vtp/queue

AWS SQS helpers for background job delivery.

## Features

- SQS client factory with optional LocalStack endpoint support
- Send, receive, acknowledge, and release queue messages
- Typed job payloads correlated with `background_jobs` rows in Postgres

## Usage

```ts
import {
  createSqsClient,
  deleteJobMessage,
  receiveJobMessage,
  sendJobMessage,
} from "@vtp/queue";
```

Set `AWS_ENABLED=true` and provide queue URLs to route jobs through SQS instead of the in-memory Postgres queue.
