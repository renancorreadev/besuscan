# -------- Stage 1: Builder --------
    FROM golang:1.24-alpine AS builder

    WORKDIR /app
    
    # Instalar dependências de build
    RUN apk add --no-cache git
    
    # Copiar código fonte
    COPY . .
    
    # Build da aplicação
    RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd
    
    # -------- Stage 2: Distroless --------
    FROM alpine:latest

    WORKDIR /app
    
    # Copiar binário compilado
    COPY --from=builder /app/main .
    
    # Adicionar certificados CA
    RUN apk add --no-cache ca-certificates
    
    EXPOSE 8080
    
    CMD ["./main"]
    