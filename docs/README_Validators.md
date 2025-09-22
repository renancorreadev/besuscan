# BesuScan Validators API - Postman Collection

Esta collection contém todos os endpoints da API de Validadores QBFT do BesuScan Block Explorer.

## 📁 Arquivos da Collection

- **`BesuScan_Validators_API_Collection.postman_collection.json`** - Collection principal com todos os endpoints
- **`BesuScan_Environment.postman_environment.json`** - Environment atualizado com variáveis para validadores

## 🚀 Como Importar

1. **Abrir o Postman**
2. **Importar Collection:**
   - Clique em `Import`
   - Selecione o arquivo `BesuScan_Validators_API_Collection.postman_collection.json`
3. **Importar Environment:**
   - Clique em `Import`
   - Selecione o arquivo `BesuScan_Environment.postman_environment.json`
4. **Selecionar Environment:**
   - No canto superior direito, selecione "BesuScan API Environment"

## 🔗 Endpoints Disponíveis

### 📊 Métricas e Status
- **`GET /api/validators/metrics`** - Métricas gerais da rede QBFT
- **`GET /api/validators/health`** - Health check do sistema de validadores

### 👥 Listagem de Validadores
- **`GET /api/validators`** - Lista todos os validadores
- **`GET /api/validators/active`** - Lista apenas validadores ativos
- **`GET /api/validators/inactive`** - Lista apenas validadores inativos

### 🔍 Validador Específico
- **`GET /api/validators/{address}`** - Busca validador por endereço

### 🔄 Sincronização
- **`POST /api/validators/sync`** - Força sincronização com a rede QBFT

## 🔧 Variáveis de Environment

| Variável | Valor Padrão | Descrição |
|----------|--------------|-----------|
| `baseUrl` | `http://localhost:8080` | URL base da API |
| `host` | `localhost` | Hostname do servidor |
| `validator1` | `0x742d35cc...` | Endereço de validador ativo (exemplo) |
| `validator2` | `0x8f9b2d4c...` | Endereço de validador ativo (exemplo) |
| `validatorInactive` | `0x1e2f3a4b...` | Endereço de validador inativo (exemplo) |
| `invalidValidator` | `0xinvalidaddress` | Endereço inválido para testes de erro |

## 📋 Exemplos de Uso

### 1. Verificar Métricas da Rede
```http
GET {{baseUrl}}/api/validators/metrics
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "total_validators": 4,
    "active_validators": 4,
    "inactive_validators": 0,
    "current_epoch": 15234,
    "consensus_type": "QBFT",
    "network_uptime": 99.8,
    "last_updated": "2025-01-27T12:00:00Z"
  }
}
```

### 2. Listar Validadores Ativos
```http
GET {{baseUrl}}/api/validators/active
```

### 3. Buscar Validador Específico
```http
GET {{baseUrl}}/api/validators/{{validator1}}
```

### 4. Sincronizar Validadores
```http
POST {{baseUrl}}/api/validators/sync
```

## 🧪 Testes Automáticos

A collection inclui testes automáticos que verificam:

- ✅ Status code da resposta (200/201)
- ✅ Estrutura da resposta (propriedade `success`)
- ✅ Content-Type é JSON
- ✅ Log automático das respostas para debug

## 🛠️ Configuração do Ambiente

### Desenvolvimento Local
```json
{
  "baseUrl": "http://localhost:8080",
  "host": "localhost"
}
```

### Produção
```json
{
  "baseUrl": "http://147.93.11.54:8080",
  "host": "147.93.11.54"
}
```

## 📝 Estrutura das Respostas

### Resposta de Sucesso
```json
{
  "success": true,
  "data": { ... }
}
```

### Resposta de Erro
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

## 🔍 Validador Object Schema

```json
{
  "address": "string",                    // Endereço do validador
  "proposed_block_count": "string",       // Número de blocos propostos
  "last_proposed_block_number": "string", // Último bloco proposto
  "status": "active|inactive",            // Status atual
  "is_active": "boolean",                 // Se está ativo
  "uptime": "number",                     // Porcentagem de uptime
  "first_seen": "string",                 // Data/hora primeira vez visto
  "last_seen": "string",                  // Data/hora última vez ativo
  "created_at": "string",                 // Data de criação no DB
  "updated_at": "string"                  // Data de última atualização
}
```

## 💡 Dicas de Uso

1. **Use variáveis**: Aproveite as variáveis do environment para trocar facilmente entre ambientes
2. **Monitore logs**: Os scripts de teste automaticamente logam as respostas no console
3. **Teste erros**: Use `{{invalidValidator}}` para testar cenários de erro
4. **Sincronização**: Execute o endpoint de sync antes de testar listagens para garantir dados atualizados

## 🐛 Troubleshooting

### Erro de Conexão
- Verifique se a API está rodando: `make status`
- Verifique se a migração foi executada: `docker exec explorer-postgres-dev psql -U explorer -d blockexplorer -c "\dt validators"`

### Dados Vazios
- Execute a sincronização: `POST /api/validators/sync`
- Verifique logs da API: `make logs-api`
- Verifique conectividade com QBFT: `GET /api/validators/health`

### Validadores Não Aparecem
- Confirme que a variável de ambiente `BESU_RPC_URL` está configurada
- Verifique se o worker está rodando: `make logs-worker`
- Execute sincronização manual

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs: `make logs-api` e `make logs-worker`
2. Execute health check: `GET /api/validators/health`
3. Confirme que a migração foi aplicada
4. Verifique variáveis de ambiente `BESU_RPC_URL` 