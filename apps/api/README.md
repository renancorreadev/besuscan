# BesuScan API

API REST para explorar dados da blockchain Hyperledger Besu. Fornece endpoints para consultar blocos, transações e estatísticas da rede.

## 🚀 Início Rápido

### Pré-requisitos
- Docker e Docker Compose
- PostgreSQL com dados dos blocos
- Go 1.24+ (para desenvolvimento)

### Executando a API
```bash
# Iniciar todos os serviços
make up

# Ou apenas a API
make up-api

# Verificar status
make check-services
```

A API estará disponível em: `http://localhost:8080`

## 📋 Endpoints Disponíveis

### Status da API
```bash
GET /health
```

### Blocos
```bash
GET /api/blocks                       # Lista blocos recentes
GET /api/blocks/latest               # Último bloco
GET /api/blocks/stats                # Estatísticas dos blocos
GET /api/blocks/range                # Blocos em intervalo
GET /api/blocks/:identifier          # Bloco específico
```

### Transações (Em desenvolvimento)
```bash
GET /api/transactions                # Lista transações
```

## 🔧 Exemplos de Uso com Dados Reais

### 1. Verificar Status da API
```bash
curl -X GET "http://localhost:8080/health" \
  -H "Content-Type: application/json"
```

**Resposta:**
```json
{
  "service": "BesuScan API",
  "status": "ok",
  "timestamp": "2025-06-13T02:15:30.123Z"
}
```

### 2. Listar Blocos Recentes
```bash
# Últimos 10 blocos (padrão)
curl -X GET "http://localhost:8080/api/blocks" \
  -H "Content-Type: application/json"

# Últimos 5 blocos
curl -X GET "http://localhost:8080/api/blocks?limit=5" \
  -H "Content-Type: application/json"

# Últimos 20 blocos (máximo 100)
curl -X GET "http://localhost:8080/api/blocks?limit=20" \
  -H "Content-Type: application/json"
```

**Resposta:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "number": 389152,
      "hash": "0xe08d8e9c4377b6bcc32db7afe9854e40266a50b8d6396a71c3511818bfb7ddd6",
      "timestamp": "2025-06-13T02:02:54Z",
      "miner": "0xA18a82795117012A1e2271e357BE6b9b55DF9A29",
      "tx_count": 0,
      "gas_used": 0,
      "size": 840
    },
    {
      "number": 389150,
      "hash": "0xbe8aa318333e989ad6059d49b60a1589e78faa2638eb86f1808ac66a54a43df4",
      "timestamp": "2025-06-13T02:02:46Z",
      "miner": "0x1c369027A259626315C3D3Adc866815385A502f7",
      "tx_count": 0,
      "gas_used": 0,
      "size": 840
    }
  ]
}
```

### 3. Buscar Último Bloco
```bash
curl -X GET "http://localhost:8080/api/blocks/latest" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "number": 389152,
    "hash": "0xe08d8e9c4377b6bcc32db7afe9854e40266a50b8d6396a71c3511818bfb7ddd6",
    "parent_hash": "0x597a418c2f2985d5e41e59037f071b2264be5d8d2fc78f16dbe097b46f269a0b",
    "timestamp": "2025-06-13T02:02:54Z",
    "miner": "0xA18a82795117012A1e2271e357BE6b9b55DF9A29",
    "difficulty": "1",
    "size": 840,
    "gas_limit": 4700000,
    "gas_used": 0,
    "tx_count": 0,
    "uncle_count": 0,
    "created_at": "2025-06-13T02:02:55Z",
    "updated_at": "2025-06-13T02:02:55Z"
  }
}
```

### 4. Buscar Bloco Específico

#### Por Número (Bloco 389152)
```bash
curl -X GET "http://localhost:8080/api/blocks/389152" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: BesuScan-Client/1.0"
```

#### Por Hash (Hash Real do Bloco 389152)
```bash
curl -X GET "http://localhost:8080/api/blocks/0xe08d8e9c4377b6bcc32db7afe9854e40266a50b8d6396a71c3511818bfb7ddd6" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: BesuScan-Client/1.0"
```

#### Outros Blocos Reais para Teste
```bash
# Bloco 389150
curl -X GET "http://localhost:8080/api/blocks/389150" \
  -H "Content-Type: application/json"

# Bloco 389148
curl -X GET "http://localhost:8080/api/blocks/389148" \
  -H "Content-Type: application/json"

# Bloco 389146
curl -X GET "http://localhost:8080/api/blocks/389146" \
  -H "Content-Type: application/json"

# Bloco 389144
curl -X GET "http://localhost:8080/api/blocks/389144" \
  -H "Content-Type: application/json"
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "number": 389152,
    "hash": "0xe08d8e9c4377b6bcc32db7afe9854e40266a50b8d6396a71c3511818bfb7ddd6",
    "parent_hash": "0x597a418c2f2985d5e41e59037f071b2264be5d8d2fc78f16dbe097b46f269a0b",
    "timestamp": "2025-06-13T02:02:54Z",
    "miner": "0xA18a82795117012A1e2271e357BE6b9b55DF9A29",
    "difficulty": "1",
    "total_difficulty": null,
    "size": 840,
    "gas_limit": 4700000,
    "gas_used": 0,
    "base_fee_per_gas": null,
    "tx_count": 0,
    "uncle_count": 0,
    "created_at": "2025-06-13T02:02:55Z",
    "updated_at": "2025-06-13T02:02:55Z"
  }
}
```

### 5. Buscar Blocos em Intervalo (Dados Reais)
```bash
# Intervalo dos últimos 5 blocos salvos (389144 a 389152)
curl -X GET "http://localhost:8080/api/blocks/range?from=389144&to=389152" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"

# Intervalo menor (389148 a 389152)
curl -X GET "http://localhost:8080/api/blocks/range?from=389148&to=389152" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"

# Intervalo de 3 blocos (389146 a 389148)
curl -X GET "http://localhost:8080/api/blocks/range?from=389146&to=389148" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

**Resposta:**
```json
{
  "success": true,
  "count": 3,
  "range": {
    "from": 389148,
    "to": 389152
  },
  "data": [
    {
      "number": 389152,
      "hash": "0xe08d8e9c4377b6bcc32db7afe9854e40266a50b8d6396a71c3511818bfb7ddd6",
      "timestamp": "2025-06-13T02:02:54Z",
      "miner": "0xA18a82795117012A1e2271e357BE6b9b55DF9A29",
      "tx_count": 0,
      "gas_used": 0,
      "size": 840
    },
    {
      "number": 389150,
      "hash": "0xbe8aa318333e989ad6059d49b60a1589e78faa2638eb86f1808ac66a54a43df4",
      "timestamp": "2025-06-13T02:02:46Z",
      "miner": "0x1c369027A259626315C3D3Adc866815385A502f7",
      "tx_count": 0,
      "gas_used": 0,
      "size": 840
    },
    {
      "number": 389148,
      "hash": "0x7cdbd8c13c48bc058b6e4985a5918bf7aebe84b3899f271b3b85dbdd7b3632f0",
      "timestamp": "2025-06-13T02:02:38Z",
      "miner": "0xA18a82795117012A1e2271e357BE6b9b55DF9A29",
      "tx_count": 0,
      "gas_used": 0,
      "size": 840
    }
  ]
}
```

### 6. Estatísticas dos Blocos
```bash
curl -X GET "http://localhost:8080/api/blocks/stats" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Cache-Control: no-cache"
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total_blocks": 1247,
    "latest_block_number": 389152,
    "latest_block_hash": "0xe08d8e9c4377b6bcc32db7afe9854e40266a50b8d6396a71c3511818bfb7ddd6",
    "latest_block_timestamp": "2025-06-13T02:02:54Z"
  }
}
```

### 7. Testes com Hashes Reais Completos
```bash
# Hash do bloco 389150
curl -X GET "http://localhost:8080/api/blocks/0xbe8aa318333e989ad6059d49b60a1589e78faa2638eb86f1808ac66a54a43df4" \
  -H "Content-Type: application/json"

# Hash do bloco 389148  
curl -X GET "http://localhost:8080/api/blocks/0x7cdbd8c13c48bc058b6e4985a5918bf7aebe84b3899f271b3b85dbdd7b3632f0" \
  -H "Content-Type: application/json"

# Hash do bloco 389146
curl -X GET "http://localhost:8080/api/blocks/0xfcd5a3dfa4e452861767fdcb29f4d7fac1b1cc88d487cfa1ec1c91b9ba075f92" \
  -H "Content-Type: application/json"

# Hash do bloco 389144
curl -X GET "http://localhost:8080/api/blocks/0xdc7563ac40afef75b07e109b01b3285b78fadbe8867c68eec4a2cdb861d89309" \
  -H "Content-Type: application/json"
```

### 8. Comandos Completos para Teste Rápido
```bash
# Script completo para testar todos os endpoints
#!/bin/bash

echo "=== Testando BesuScan API ==="

echo "1. Status da API:"
curl -s -X GET "http://localhost:8080/health" -H "Content-Type: application/json" | jq

echo -e "\n2. Últimos 3 blocos:"
curl -s -X GET "http://localhost:8080/api/blocks?limit=3" -H "Content-Type: application/json" | jq

echo -e "\n3. Último bloco:"
curl -s -X GET "http://localhost:8080/api/blocks/latest" -H "Content-Type: application/json" | jq

echo -e "\n4. Bloco específico (389152):"
curl -s -X GET "http://localhost:8080/api/blocks/389152" -H "Content-Type: application/json" | jq

echo -e "\n5. Intervalo de blocos (389148-389152):"
curl -s -X GET "http://localhost:8080/api/blocks/range?from=389148&to=389152" -H "Content-Type: application/json" | jq

echo -e "\n6. Estatísticas:"
curl -s -X GET "http://localhost:8080/api/blocks/stats" -H "Content-Type: application/json" | jq

echo -e "\n=== Teste Completo ==="
```

## 📊 Parâmetros de Consulta

### Blocos Recentes (`/api/blocks`)
- `limit` (opcional): Número de blocos a retornar (padrão: 10, máximo: 100)

### Intervalo de Blocos (`/api/blocks/range`)
- `from` (obrigatório): Número do bloco inicial
- `to` (obrigatório): Número do bloco final
- **Limitação**: Máximo 100 blocos por consulta

## ❌ Tratamento de Erros

### Bloco Não Encontrado
```bash
curl -X GET "http://localhost:8080/api/blocks/999999"
```

**Resposta (404):**
```json
{
  "error": "Bloco não encontrado"
}
```

### Parâmetro Inválido
```bash
curl -X GET "http://localhost:8080/api/blocks/invalid-hash"
```

**Resposta (400):**
```json
{
  "error": "identificador inválido: deve ser um número ou hash (0x...)"
}
```

### Intervalo Inválido
```bash
curl -X GET "http://localhost:8080/api/blocks/range?from=100&to=50"
```

**Resposta (400):**
```json
{
  "error": "intervalo inválido: from (100) > to (50)"
}
```

### Intervalo Muito Grande
```bash
curl -X GET "http://localhost:8080/api/blocks/range?from=1&to=200"
```

**Resposta (400):**
```json
{
  "error": "intervalo muito grande (máximo 100 blocos)"
}
```

## 🏗️ Arquitetura

A API segue os princípios de **Clean Architecture**:

```
apps/api/
├── cmd/main.go                              # Ponto de entrada
├── internal/
│   ├── domain/                              # Camada de Domínio
│   │   ├── entities/block.go               # Entidades
│   │   └── repositories/block_repository.go # Interfaces
│   ├── app/                                # Camada de Aplicação
│   │   └── services/block_service.go       # Lógica de negócio
│   ├── infrastructure/                     # Camada de Infraestrutura
│   │   └── database/postgres_block_repository.go # Implementações
│   └── interfaces/                         # Camada de Interface
│       └── http/handlers/block_handler.go  # Controllers HTTP
```

## 🔧 Desenvolvimento

### Executar em Modo de Desenvolvimento
```bash
# Com hot-reload
make up-api

# Logs da API
make logs-api

# Reiniciar apenas a API
make restart-api
```

### Variáveis de Ambiente
```bash
DATABASE_URL=postgres://explorer:explorer@postgres:5432/blockexplorer?sslmode=disable
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
PORT=8080
```

### Testes
```bash
# Executar testes
cd apps/api
go test ./...

# Com coverage
go test -cover ./...
```

## 📝 Notas Técnicas

- **Consenso**: IBFT/QBFT (dificuldade sempre = 1)
- **Tempo de bloco**: ~15 segundos
- **Mineradores**: Alternância entre validadores configurados
- **Transações**: Atualmente 0 (rede em desenvolvimento)
- **Gas Limit**: 4.7M por bloco
- **Tamanho do bloco**: ~840 bytes (blocos vazios)

## 🚧 Roadmap

- [ ] Endpoints de transações
- [ ] Paginação avançada
- [ ] Cache Redis
- [ ] Rate limiting
- [ ] Autenticação JWT
- [ ] WebSocket para dados em tempo real
- [ ] Métricas Prometheus
- [ ] Documentação OpenAPI/Swagger

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes. 