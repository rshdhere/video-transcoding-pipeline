# syntax=docker/dockerfile:1

FROM oven/bun:1.2.3-alpine AS prepare
WORKDIR /app
RUN bun add -g turbo@2.9.16
COPY . .
RUN turbo prune web --docker

FROM oven/bun:1.2.3-alpine AS deps
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=prepare /app/out/json/ .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prepare /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
ARG API_URL=http://localhost:3001
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV API_URL=$API_URL NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
WORKDIR /app/apps/web
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
