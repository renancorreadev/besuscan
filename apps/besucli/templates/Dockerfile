# ==============================================================================
# BUILD STAGE
# ==============================================================================
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY . .

# Build da aplicação
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd

# ==============================================================================
# FINAL STAGE
# ==============================================================================
FROM alpine:latest

WORKDIR /app

# Copiar binário compilado
COPY --from=builder /app/main .
COPY --from=builder /app/config ./config
COPY --from=builder /app/templates ./templates

# Adicionar certificados CA
RUN apk add --no-cache ca-certificates

# Criar usuário não-root
RUN adduser -D besucli
USER besucli

ENTRYPOINT ["./main"]

# Labels para metadados
LABEL org.opencontainers.image.title="BesuCLI"
LABEL org.opencontainers.image.description="BesuScan Command Line Interface for Hyperledger Besu Explorer"
LABEL org.opencontainers.image.vendor="HubWeb3"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_TIME}"
LABEL org.opencontainers.image.source="https://github.com/hubweb3/besuscan" 