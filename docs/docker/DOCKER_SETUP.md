# 🐳 Docker Setup - NXplorer

Este arquivo contém as instruções para executar todo o ambiente de desenvolvimento usando Docker.

## 📋 Serviços Configurados

- **PostgreSQL** (porta 5433) - Banco de dados
- **RabbitMQ** (porta 5673 + management 15673) - Message broker
- **Indexer** (porta 8081) - Serviço de indexação de blocos
- **API** (porta 8080) - API REST
- **Frontend** (porta 3000) - Interface web
- **Worker** - Processador de eventos

## 🚀 Como Executar

### Subir todos os serviços
```bash
docker-compose -f docker-compose.dev.yml up
```

### Subir serviços específicos
```bash
# Apenas infraestrutura
docker-compose -f docker-compose.dev.yml up postgres rabbitmq

# Apenas aplicações
docker-compose -f docker-compose.dev.yml up indexer api frontend

# Serviços individuais
docker-compose -f docker-compose.dev.yml up indexer
docker-compose -f docker-compose.dev.yml up api
docker-compose -f docker-compose.dev.yml up frontend
```

### Executar em background
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Ver logs
```bash
# Todos os serviços
docker-compose -f docker-compose.dev.yml logs -f

# Serviço específico
docker-compose -f docker-compose.dev.yml logs -f indexer
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f frontend
```

### Parar serviços
```bash
docker-compose -f docker-compose.dev.yml down
```

### Rebuild (após mudanças no Dockerfile)
```bash
docker-compose -f docker-compose.dev.yml up --build
```

## 🔗 URLs de Acesso

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080
- **Indexer**: http://localhost:8081
- **RabbitMQ Management**: http://localhost:15673 (guest/guest)
- **PostgreSQL**: localhost:5433

## 🌐 Conexões Entre Serviços

### Rede Interna (explorer-network)
Todos os serviços estão na mesma rede Docker e podem se comunicar usando os nomes dos serviços:

- `postgres:5432` - Banco de dados
- `rabbitmq:5672` - RabbitMQ
- `api:8080` - API
- `indexer:8080` - Indexer

### Variáveis de Ambiente Configuradas

**Indexer:**
- `ETH_WS_URL=wss://wsrpc.hubweb3.com`
- `RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/`
- `RABBITMQ_EXCHANGE=blockchain_events`
- `SYNC_INTERVAL=5`

**API:**
- `DATABASE_URL=postgres://explorer:explorer@postgres:5432/blockexplorer?sslmode=disable`
- `RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/`
- `RABBITMQ_EXCHANGE=blockchain_events`
- `PORT=8080`

**Worker:**
- `DATABASE_URL=postgres://explorer:explorer@postgres:5432/blockexplorer?sslmode=disable`
- `RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/`
- `RABBITMQ_EXCHANGE=blockchain_events`

**Frontend:**
- `NODE_ENV=development`
- `VITE_API_URL=http://147.93.11.54:8080`

## 🔧 Hot Reload

Todos os serviços de aplicação (indexer, api, worker, frontend) estão configurados com hot reload:

- **Go Apps**: Usando Air para recompilação automática
- **Frontend**: Usando Vite dev server

## 📝 Notas Importantes

1. **Primeira execução**: Pode demorar mais para baixar as imagens e instalar dependências
2. **Volumes**: Os códigos fonte são montados como volumes para permitir hot reload
3. **Dependências Go**: São compartilhadas entre os serviços Go através do volume `go-modules`
4. **Node modules**: São mantidos dentro do container do frontend para melhor performance

## 🐛 Troubleshooting

### Erro de conexão entre serviços
- Verifique se todos os serviços estão na mesma rede (`explorer-network`)
- Use os nomes dos serviços Docker, não `localhost`

### Problemas com hot reload
- Verifique se os volumes estão montados corretamente
- Reinicie o serviço específico: `docker-compose -f docker-compose.dev.yml restart <service>`

### Limpar tudo e recomeçar
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
``` 