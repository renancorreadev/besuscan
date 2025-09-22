# 📋 Accounts API Collection - Blockchain Explorer

## 🎯 Overview

Esta collection Postman fornece acesso completo às APIs de Accounts do Blockchain Explorer, suportando tanto **EOA (Externally Owned Accounts)** quanto **Smart Accounts (ERC-4337)** com recursos corporativos para ambientes empresariais usando Hyperledger Besu.

## 🚀 Quick Start

### 1. Importar Collection
1. Abra o Postman
2. Clique em "Import"
3. Selecione o arquivo `Accounts_API_Collection.postman_collection.json`
4. A collection será importada com todas as variáveis configuradas

### 2. Configurar Environment
As seguintes variáveis são configuradas automaticamente:
- `base_url`: `http://147.93.11.54:8080`
- `account_address`: `0x742d35Cc6634C0532925a3b8D4C9db96C4C4C4C4`
- `factory_address`: `0x4e59b44847b379578588920ca78fbf26c0b4956c`
- `owner_address`: `0x742d35Cc6634C0532925a3b8D4C9db96C4C4C4C4`
- `account_type`: `EOA`

### 3. Executar Requests
Todos os requests incluem:
- ✅ Testes automáticos de validação
- 📝 Documentação detalhada
- 🔄 Exemplos de response
- 🎯 Configuração automática de variáveis

## 📚 API Endpoints Summary

### 📋 Account Listing & Search
- `GET /api/accounts` - Lista todas as accounts com filtros avançados
- `GET /api/accounts/search` - Busca accounts por termo
- `GET /api/accounts/type/{type}` - Accounts por tipo

### 👤 Individual Account Details  
- `GET /api/accounts/{address}` - Detalhes completos da account
- `GET /api/accounts/{address}/tags` - Tags da account
- `GET /api/accounts/{address}/analytics` - Métricas analíticas
- `GET /api/accounts/{address}/interactions` - Interações com contratos
- `GET /api/accounts/{address}/tokens` - Holdings de tokens

### 📊 Rankings & Categories
- `GET /api/accounts/top/balance` - Top accounts por saldo
- `GET /api/accounts/top/transactions` - Top accounts por transações
- `GET /api/accounts/recent/active` - Accounts ativas recentemente

### 🔐 Smart Accounts (ERC-4337)
- `GET /api/accounts/smart` - Todas as Smart Accounts
- `GET /api/accounts/factory/{factory_address}` - Accounts por factory
- `GET /api/accounts/owner/{owner_address}` - Accounts por owner

### 📈 Statistics & Analytics
- `GET /api/accounts/stats` - Estatísticas gerais
- `GET /api/accounts/stats/type` - Estatísticas por tipo
- `GET /api/accounts/stats/compliance` - Estatísticas de compliance

## 🏢 Corporate Features

### Risk Scoring (0-10)
- **MINIMAL** (0-1): Risco mínimo
- **LOW** (2-4): Risco baixo  
- **MEDIUM** (5-7): Risco médio
- **HIGH** (8-10): Risco alto

### Compliance Status
- `compliant`: Em compliance
- `non_compliant`: Fora de compliance
- `pending`: Análise pendente
- `under_review`: Sob revisão

### Account Types
- **EOA**: Externally Owned Account
- **Smart Account**: ERC-4337 Account Abstraction

## 🧪 Testing Features

Cada request inclui:
- ✅ Validação automática de status code
- ✅ Validação de estrutura de response
- ✅ Testes de performance (< 2s)
- ✅ Extração dinâmica de variáveis

## 📝 Usage Examples

### Buscar Accounts Corporativas
```
GET /api/accounts?tags=corporate,verified&compliance_status=compliant&min_balance=1000000000000000000
```

### Smart Accounts de Alto Risco
```
GET /api/accounts/smart?min_risk_score=7&limit=20
```

### Análise de Atividade
```
GET /api/accounts/{address}/analytics?days=90
```

## 🔧 Environment Variables

```javascript
{
  "base_url": "http://147.93.11.54:8080",
  "account_address": "0x742d35Cc6634C0532925a3b8D4C9db96C4C4C4C4",
  "factory_address": "0x4e59b44847b379578588920ca78fbf26c0b4956c",
  "owner_address": "0x742d35Cc6634C0532925a3b8D4C9db96C4C4C4C4",
  "account_type": "EOA"
}
```

## 🚨 Error Handling

### Common Errors
- `400`: Parâmetros inválidos
- `404`: Account não encontrada  
- `500`: Erro interno do servidor

### Example Error Response
```json
{
  "error": "Endereço da account é obrigatório"
}
```

## 🔄 Architecture

```
Hyperledger Besu → Worker (RabbitMQ) → PostgreSQL ← API (read-only) ← Frontend
```

**Important**: A API é **read-only**. Operações de escrita são feitas pelo Worker.

---

**Version**: 1.0.0  
**Last Updated**: January 2024

## 🎯 Best Practices

### 1. Pagination
- Use sempre `limit` e `page` para grandes datasets
- Máximo recomendado: `limit=100`

### 2. Filtering
- Combine filtros para resultados mais precisos
- Use `order_by` e `order_dir` para ordenação consistente

### 3. Performance
- Cache responses quando possível
- Use filtros específicos para reduzir payload

### 4. Error Handling
- Sempre verifique o campo `success` na response
- Implemente retry logic para requests falhados

## 📊 Monitoring & Analytics

### Key Metrics
- Response time per endpoint
- Error rate by endpoint
- Most used filters
- Peak usage times

### Performance Benchmarks
- Average response time: < 500ms
- 95th percentile: < 1000ms
- Error rate: < 1%
- Uptime: > 99.9%

## 🔐 Security Considerations

### Rate Limiting
- Implementar rate limiting por IP
- Throttling para requests intensivos

### Data Privacy
- Logs não devem conter dados sensíveis
- Compliance com LGPD/GDPR

### Access Control
- Autenticação para endpoints sensíveis
- Auditoria de acesso a dados corporativos

---

## 📞 Support

Para suporte técnico ou dúvidas sobre a API:
- 📧 Email: dev-team@company.com
- 📱 Slack: #blockchain-explorer
- 📖 Wiki: [Internal Documentation](https://wiki.company.com/blockchain-explorer)
