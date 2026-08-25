FROM golang:1.23-alpine AS builder

WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/media-gateway ./cmd/server

FROM alpine:3.21
RUN apk add --no-cache ca-certificates wget && \
    addgroup -S -g 10001 netphim && \
    adduser -S -D -H -u 10001 -G netphim netphim
COPY --from=builder /out/media-gateway /usr/local/bin/media-gateway
USER netphim
EXPOSE 8081
ENTRYPOINT ["/usr/local/bin/media-gateway"]
