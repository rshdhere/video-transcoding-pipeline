# Web

Next.js frontend for the video transcoding pipeline, built with shadcn/ui.

## Run

From the repo root (starts API + web):

```bash
bun run dev
```

Or start only the web app:

```bash
bun run dev --filter=web
```

Copy `.env.example` to `.env.local` and ensure the API server is running on port `3001`.

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/login` | Sign in |
| `/signup` | Create account |
| `/dashboard` | Upload videos and list uploads |
| `/videos/[id]` | Variant status and downloads |

API requests are proxied through Next.js rewrites to the Bun server.
