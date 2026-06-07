FROM oven/bun:1.2.3-alpine AS prepare
WORKDIR /app
RUN bun add -g turbo@2.9.16
COPY . .
RUN turbo prune @vtp/server --docker

FROM oven/bun:1.2.3-alpine AS deps
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.2.3-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prepare /app/out/full/ .
COPY --from=deps /app/node_modules ./node_modules
WORKDIR /app/apps/server
EXPOSE 3001
USER bun
CMD ["bun", "src/bin.ts"]
