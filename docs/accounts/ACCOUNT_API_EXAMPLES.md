# Account Management API - Exemplos de Uso

Este documento mostra como usar os novos endpoints de criação e gerenciamento de accounts via API com processamento assíncrono via RabbitMQ.

## Endpoints Disponíveis

### 1. Criar Account
**POST** `/api/accounts`

### 2. Atualizar Account
**PUT** `/api/accounts/:address`

### 3. Gerenciar Tags
**POST** `/api/accounts/:address/tags`

### 4. Atualizar Compliance
**PUT** `/api/accounts/:address/compliance`

---

## Exemplos de Uso

### 1. Criar EOA Account

```bash
curl -X POST http://localhost:8080/api/accounts \
  -H "Content-Type: application/json" \
  -H "X-User-ID: admin@company.com" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    "account_type": "EOA",
    "label": "CEO Wallet",
    "description": "Carteira principal do CEO",
    "risk_score": 0,
    "compliance_status": "compliant",
    "compliance_notes": "Account verificada e aprovada",
    "tags": ["executive", "high-value", "verified"]
  }'
```

**Resposta:**
```json
{
  "success": true,
  "message": "Account será criada em breve",
  "request_id": "a1b2c3d4e5f6789012345678",
  "data": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    "account_type": "EOA",
    "status": "processing",
    "estimated_completion": "2024-01-15T10:30:45Z"
  }
}
```

### 2. Criar Smart Account (ERC-4337)

```bash
curl -X POST http://localhost:8080/api/accounts \
  -H "Content-Type: application/json" \
  -H "X-User-ID: admin@company.com" \
  -d '{
    "address": "0x1234567890123456789012345678901234567890",
    "account_type": "Smart Account",
    "factory_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "implementation_address": "0x9876543210987654321098765432109876543210",
    "owner_address": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    "label": "Corporate Smart Account",
    "description": "Smart Account para operações corporativas",
    "risk_score": 2,
    "compliance_status": "under_review",
    "compliance_notes": "Smart Account em processo de auditoria",
    "tags": ["smart-account", "corporate", "erc4337"]
  }'
```

### 3. Atualizar Account Existente

```bash
curl -X PUT http://localhost:8080/api/accounts/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87 \
  -H "Content-Type: application/json" \
  -H "X-User-ID: compliance@company.com" \
  -d '{
    "label": "CEO Wallet - Updated",
    "risk_score": 1,
    "compliance_status": "compliant",
    "compliance_notes": "Revisão de compliance concluída com sucesso"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "message": "Account será atualizada em breve",
  "request_id": "b2c3d4e5f6789012345678a1",
  "data": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    "status": "processing",
    "estimated_completion": "2024-01-15T10:31:00Z"
  }
}
```

### 4. Adicionar Tags

```bash
curl -X POST http://localhost:8080/api/accounts/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87/tags \
  -H "Content-Type: application/json" \
  -H "X-User-ID: admin@company.com" \
  -d '{
    "tags": ["kyc-verified", "premium"],
    "operation": "add"
  }'
```

### 5. Substituir Tags

```bash
curl -X POST http://localhost:8080/api/accounts/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87/tags \
  -H "Content-Type: application/json" \
  -H "X-User-ID: admin@company.com" \
  -d '{
    "tags": ["executive", "verified", "high-priority"],
    "operation": "replace"
  }'
```

### 6. Remover Tags

```bash
curl -X POST http://localhost:8080/api/accounts/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87/tags \
  -H "Content-Type: application/json" \
  -H "X-User-ID: admin@company.com" \
  -d '{
    "tags": ["old-tag", "deprecated"],
    "operation": "remove"
  }'
```

### 7. Atualizar Compliance

```bash
curl -X PUT http://localhost:8080/api/accounts/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87/compliance \
  -H "Content-Type: application/json" \
  -H "X-User-ID: compliance@company.com" \
  -d '{
    "compliance_status": "non_compliant",
    "compliance_notes": "Atividade suspeita detectada - requer investigação",
    "risk_score": 8,
    "reviewed_by": "compliance@company.com",
    "review_reason": "Automated risk detection alert"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "message": "Compliance será atualizada em breve",
  "request_id": "c3d4e5f6789012345678a1b2",
  "data": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    "compliance_status": "non_compliant",
    "status": "processing",
    "estimated_completion": "2024-01-15T10:31:20Z"
  }
}
```

---

## Validações e Regras

### Campos Obrigatórios

#### Criar Account:
- `address` - Endereço Ethereum válido (0x + 40 chars)
- `account_type` - "EOA" ou "Smart Account"

#### Smart Account:
- Deve ter pelo menos um dos campos: `factory_address`, `implementation_address`, ou `owner_address`

### Validações de Dados

- **Risk Score**: Deve estar entre 0 e 10
- **Compliance Status**: `compliant`, `non_compliant`, `pending`, `under_review`
- **Tag Operations**: `add`, `remove`, `replace`
- **Address**: Deve ser um endereço Ethereum válido

### Headers Opcionais

- `X-User-ID`: Identifica quem está fazendo a operação (para auditoria)
- `X-Request-ID`: ID único da requisição (gerado automaticamente se não fornecido)

---

## Códigos de Resposta

- **202 Accepted**: Operação aceita e será processada em breve
- **400 Bad Request**: Dados inválidos ou campos obrigatórios ausentes
- **404 Not Found**: Account não encontrada (para operações de atualização)
- **409 Conflict**: Account já existe (para criação)
- **503 Service Unavailable**: Serviço de fila indisponível

---

## Monitoramento

### Verificar Status da Operação

Após enviar uma requisição, você pode verificar se a account foi criada/atualizada:

```bash
curl -X GET http://localhost:8080/api/accounts/0x742d35Cc6634C0532925a3b8D4C9db96590c6C87
```

### Logs do Worker

O worker processa as mensagens e registra logs detalhados:

```
Processing account creation from API: 0x742d35Cc... (type: EOA, source: api)
Account created successfully from API: 0x742d35Cc... (priority: 1)
```

---

## Integração com Frontend

### JavaScript/TypeScript

```javascript
// Criar account
async function createAccount(accountData) {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getCurrentUserId()
    },
    body: JSON.stringify(accountData)
  });
  
  if (response.status === 202) {
    const result = await response.json();
    console.log('Account creation queued:', result.request_id);
    
    // Polling para verificar se foi criada
    setTimeout(() => checkAccountCreated(accountData.address), 5000);
  }
}

// Verificar se account foi criada
async function checkAccountCreated(address) {
  const response = await fetch(`/api/accounts/${address}`);
  if (response.ok) {
    console.log('Account created successfully!');
  } else {
    // Tentar novamente em alguns segundos
    setTimeout(() => checkAccountCreated(address), 2000);
  }
}
```

---

## Arquitetura do Sistema

```
API (POST) → RabbitMQ Queue → Worker → Database
     ↓
  202 Accepted
  (Processing)
```

1. **API** recebe requisição e valida dados
2. **API** envia mensagem para fila RabbitMQ
3. **API** retorna 202 Accepted com request_id
4. **Worker** processa mensagem da fila
5. **Worker** salva/atualiza no banco de dados
6. **Cliente** pode verificar resultado via GET

Este design garante:
- **Performance**: API responde rapidamente
- **Confiabilidade**: Mensagens persistem na fila
- **Escalabilidade**: Múltiplos workers podem processar
- **Auditoria**: Todas operações são logadas 