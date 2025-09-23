# 🚀 Guia de Início Rápido

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Docker** 20.10+ e **Docker Compose** 2.0+
- **Git** para clonar o repositório
- **Node.js** 18+ (opcional, para desenvolvimento frontend)
- **Go** 1.21+ (opcional, para desenvolvimento backend)

## ⚡ Instalação Rápida (5 minutos)

### 1. **Clone o Repositório**
```bash
git clone https://github.com/hubweb3/besuscan-explorer.git
cd besuscan-explorer
```

### 2. **Inicie os Serviços**
```bash
# Desenvolvimento completo
docker-compose -f docker-compose.dev.yml up -d

# Ou apenas os serviços essenciais
docker-compose -f docker-compose.dev.yml up -d postgres rabbitmq redis
```

### 3. **Aguarde a Inicialização**
```bash
# Verificar status dos serviços
docker-compose -f docker-compose.dev.yml ps

# Acompanhar logs
docker-compose -f docker-compose.dev.yml logs -f
```

### 4. **Acesse as Interfaces**

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Frontend** | http://localhost:3002 | Interface principal do BesuScan |
| **API** | http://localhost:8080 | API REST |
| **RabbitMQ** | http://localhost:15673 | Management UI (guest/guest) |
| **Grafana** | http://localhost:3000 | Dashboards (admin/admin) |

## 🎯 Verificação da Instalação

### **1. Teste a API**
```bash
# Status da API
curl http://localhost:8080/health

# Últimos blocos
curl http://localhost:8080/api/blocks?limit=5
```

### **2. Verificar Frontend**
Acesse http://localhost:3002 e você deve ver:
- Dashboard com métricas da rede
- Lista de blocos recentes
- Barra de busca funcional

### **3. Monitorar Logs**
```bash
# Logs do indexer
docker-compose -f docker-compose.dev.yml logs -f indexer

# Logs do worker
docker-compose -f docker-compose.dev.yml logs -f worker

# Logs da API
docker-compose -f docker-compose.dev.yml logs -f api
```

## 🔧 Configuração Básica

### **Variáveis de Ambiente**

Crie um arquivo `.env` na raiz do projeto:

```bash
# .env
# Conexão com o nó Besu
ETH_RPC_URL=http://your-besu-node:8545
ETH_WS_URL=ws://your-besu-node:8546
CHAIN_ID=1337

# Banco de dados
DATABASE_URL=postgres://explorer:explorer@postgres:5432/blockexplorer?sslmode=disable

# Cache
REDIS_URL=redis://redis:6379

# Message Queue
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

# API
API_BASE_URL=http://localhost:8080/api
JWT_SECRET=your-secret-key-here

# Frontend
VITE_API_URL=http://localhost:8080/api
VITE_CHAIN_ID=1337
VITE_NETWORK_NAME=Local Besu Network
```

### **Conectar ao seu Nó Besu**

Se você já tem um nó Besu rodando:

```bash
# Parar os serviços
docker-compose -f docker-compose.dev.yml down

# Editar o arquivo docker-compose.dev.yml
# Alterar as URLs do Besu nas variáveis:
# - ETH_RPC_URL=http://seu-no-besu:8545
# - ETH_WS_URL=ws://seu-no-besu:8546

# Reiniciar
docker-compose -f docker-compose.dev.yml up -d
```

## 📊 Primeiros Passos

### **1. Explorar a Interface**

1. **Dashboard**: Veja métricas em tempo real da rede
2. **Blocos**: Navegue pelos blocos mais recentes
3. **Transações**: Explore transações detalhadas
4. **Busca**: Procure por hash, endereço ou número de bloco

### **2. Usar a API**

```bash
# Listar blocos recentes
curl "http://localhost:8080/api/blocks?limit=10" | jq

# Buscar bloco específico
curl "http://localhost:8080/api/blocks/latest" | jq

# Estatísticas da rede
curl "http://localhost:8080/api/blocks/stats" | jq

# Buscar transação
curl "http://localhost:8080/api/transactions/0x..." | jq
```

### **3. Deploy de Contrato com BesuCLI**

```bash
# Instalar BesuCLI
go install github.com/hubweb3/besucli@latest

# Configurar
besucli config set-network --rpc-url http://localhost:8545

# Deploy de um token ERC-20
besucli deploy examples/erc20.yml
```

## 🛠️ Desenvolvimento

### **Estrutura do Projeto**
```
besuscan-explorer/
├── apps/
│   ├── api/          # API REST (Go)
│   ├── indexer/      # Indexador (Go)
│   ├── worker/       # Processador (Go)
│   ├── frontend/     # Interface (React)
│   └── besucli/      # CLI (Go)
├── database/         # Scripts SQL
├── k8s/             # Kubernetes configs
├── docs/            # Documentação
└── docker-compose.dev.yml
```

### **Desenvolvimento Local**

#### **Backend (Go)**
```bash
# API
cd apps/api
go mod download
go run cmd/main.go

# Indexer
cd apps/indexer
go run cmd/main.go

# Worker
cd apps/worker
go run cmd/main.go
```

#### **Frontend (React)**
```bash
cd apps/frontend
yarn install
yarn dev
```

#### **BesuCLI**
```bash
cd apps/besucli
go build -o bin/besucli cmd/main.go
./bin/besucli --help
```

### **Hot Reload**

O ambiente de desenvolvimento usa hot reload:
- **Go**: Air para reload automático
- **React**: Vite com HMR
- **Docker**: Volumes para sincronização

## 📈 Monitoramento

### **Métricas com Prometheus**
```bash
# Métricas da API
curl http://localhost:8080/metrics

# Métricas do worker
curl http://localhost:8081/metrics

# Métricas do indexer
curl http://localhost:8082/metrics
```

### **Dashboards Grafana**
1. Acesse http://localhost:3000
2. Login: admin/admin
3. Dashboards disponíveis:
   - BesuScan Overview
   - API Performance
   - Worker Processing
   - Indexer Status

### **Logs Centralizados**
```bash
# Ver todos os logs
docker-compose -f docker-compose.dev.yml logs -f

# Logs específicos
docker-compose -f docker-compose.dev.yml logs -f api worker indexer
```

## 🔧 Comandos Úteis

### **Docker Compose**
```bash
# Iniciar todos os serviços
docker-compose -f docker-compose.dev.yml up -d

# Parar todos os serviços
docker-compose -f docker-compose.dev.yml down

# Reiniciar serviço específico
docker-compose -f docker-compose.dev.yml restart api

# Ver logs em tempo real
docker-compose -f docker-compose.dev.yml logs -f

# Executar comando no container
docker-compose -f docker-compose.dev.yml exec api bash

# Limpar volumes (CUIDADO: apaga dados)
docker-compose -f docker-compose.dev.yml down -v
```

### **Banco de Dados**
```bash
# Conectar ao PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U explorer -d blockexplorer

# Backup do banco
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U explorer blockexplorer > backup.sql

# Restaurar backup
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U explorer blockexplorer < backup.sql
```

### **Cache Redis**
```bash
# Conectar ao Redis
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# Ver chaves do cache
docker-compose -f docker-compose.dev.yml exec redis redis-cli keys "*"

# Limpar cache
docker-compose -f docker-compose.dev.yml exec redis redis-cli flushall
```

## 🐛 Troubleshooting

### **Problemas Comuns**

#### **1. Serviços não iniciam**
```bash
# Verificar logs
docker-compose -f docker-compose.dev.yml logs

# Verificar portas ocupadas
netstat -tlnp | grep -E '(3002|8080|5432|5672|6379)'

# Limpar containers antigos
docker system prune -f
```

#### **2. Frontend não carrega**
```bash
# Verificar se a API está rodando
curl http://localhost:8080/health

# Verificar logs do frontend
docker-compose -f docker-compose.dev.yml logs frontend

# Reconstruir frontend
docker-compose -f docker-compose.dev.yml up -d --build frontend
```

#### **3. Indexer não processa blocos**
```bash
# Verificar conexão com Besu
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545

# Verificar logs do indexer
docker-compose -f docker-compose.dev.yml logs indexer

# Verificar RabbitMQ
curl -u guest:guest http://localhost:15672/api/queues
```

#### **4. Worker não processa mensagens**
```bash
# Verificar filas do RabbitMQ
curl -u guest:guest http://localhost:15672/api/queues

# Verificar logs do worker
docker-compose -f docker-compose.dev.yml logs worker

# Verificar conexão com banco
docker-compose -f docker-compose.dev.yml exec postgres psql -U explorer -d blockexplorer -c "SELECT COUNT(*) FROM blocks;"
```

### **Reset Completo**
```bash
# Parar tudo
docker-compose -f docker-compose.dev.yml down -v

# Limpar imagens
docker system prune -f

# Reiniciar
docker-compose -f docker-compose.dev.yml up -d --build
```

## 📚 Próximos Passos

### **Para Usuários**
1. [Configuração Avançada](./12-configuracao.md)
2. [Usando a API](./06-api.md)
3. [Deploy de Contratos](./08-besucli.md)

### **Para Desenvolvedores**
1. [Guia de Desenvolvimento](./13-desenvolvimento.md)
2. [Arquitetura Detalhada](./01-arquitetura.md)
3. [Contribuindo](./CONTRIBUTING.md)

### **Para DevOps**
1. [Deploy em Produção](./16-deploy-k8s.md)
2. [Monitoramento](./17-monitoramento.md)
3. [Backup e Recuperação](./18-backup.md)

## 🤝 Suporte

Precisa de ajuda? Entre em contato:

- 📧 **Email**: suporte@besuscan.com
- 💬 **Discord**: [BesuScan Community](https://discord.gg/besuscan)
- 🐛 **Issues**: [GitHub Issues](https://github.com/hubweb3/besuscan-explorer/issues)
- 📖 **Docs**: [Documentação Completa](./README.md)

---

**🎉 Parabéns! Você tem o BesuScan rodando localmente!**

[⬅️ Voltar ao Índice](./README.md) | [➡️ Próximo: Configuração](./12-configuracao.md)
