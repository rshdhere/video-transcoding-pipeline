FROM golang:1.26-alpine AS builder
WORKDIR /src/apps/workers
COPY apps/workers/go.mod apps/workers/go.sum ./
RUN go mod download
COPY apps/workers/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /worker ./cmd/worker

FROM alpine:3.21
RUN apk add --no-cache ca-certificates ffmpeg yt-dlp
COPY --from=builder /worker /usr/local/bin/worker
WORKDIR /tmp
USER nobody
CMD ["worker"]
