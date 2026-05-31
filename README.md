# Video Transcoding Pipeline

This repository is now a Bun-based Turborepo workspace for the video transcoding pipeline project. The monorepo was scaffolded with `bunx create-turbo@latest . --package-manager bun` and keeps the original architecture artifact at the root for project-level documentation.

## Architecture

![Video transcoding pipeline architecture](docs/video_transcoding_pipeline_architecture.svg)

## Workspace

- `apps/web`: starter Next.js application
- `apps/docs`: starter Next.js documentation application
- `packages/ui`: shared React UI package
- `packages/eslint-config`: shared ESLint configuration
- `packages/typescript-config`: shared TypeScript configuration
- `docs/`: project-level documentation assets, including the architecture diagram above

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
