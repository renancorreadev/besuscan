# ChippedReceivablesTracker Protocol

Protocolo para tokenização e rastreabilidade de recebíveis físicos usando smart contracts.

## 🚀 Início Rápido

### 1. Configuração do Ambiente

```bash
# Configurar variáveis de ambiente (interativo)
./script/run/configure-environment.sh

# Ou usar configuração padrão
./script/run/deploy-protocol.sh all
```

### 2. Deploy Completo

```bash
# Deploy + configuração + testes em uma única execução
./script/run/deploy-protocol.sh all
```

### 3. Comandos Individuais

```bash
# Apenas deploy
./script/run/deploy-protocol.sh deploy

# Apenas configuração
./script/run/deploy-protocol.sh configure

# Apenas interações/testes
./script/run/deploy-protocol.sh interact

# Ver status
./script/run/deploy-protocol.sh status

# Limpar arquivos
./script/run/deploy-protocol.sh clean
```

## 📋 Comandos Makefile

### Deploy e Configuração

```bash
# Deploy do contrato
make deploy

# Configurar roles e permissões
make configure

# Demonstrar interações
make interact

# Executar tudo (deploy + configure + interact)
make all
```

### Utilitários

```bash
# Verificar ambiente
make check-env

# Compilar contratos
make build

# Executar testes
make test

# Verificar contrato (use CONTRACT_ADDRESS=0x...)
make verify CONTRACT_ADDRESS=0x123...

# Mostrar status
make status

# Limpar arquivos
make clean
```

## ⚙️ Configuração

### Variáveis de Ambiente

As seguintes variáveis podem ser configuradas:

```bash
# Rede Besu
export BESU_RPC_URL="http://144.22.179.183"
export BESU_PRIVATE_KEY="0x881d396b85acd82b8bf2615a8d14ffcce79b854f583bd599143ca75e7532f0bf"
export NETWORK="besu-local"
export CHAIN_ID=1337

# Contrato
export CONTRACT_NAME="ChippedReceivablesTracker"
export DEFAULT_URI="https://api.example.com/metadata/{id}.json"

# Roles (opcional)
export ISSUER_1="0x..."      # Endereço do primeiro emissor
export VALIDATOR_1="0x..."   # Endereço do primeiro validador
export AUDITOR_1="0x..."     # Endereço do primeiro auditor
```

### Configuração Personalizada

1. **Interativa**: Execute `./script/run/configure-environment.sh`
2. **Manual**: Edite o arquivo `.env` gerado
3. **Direta**: Defina as variáveis antes de executar os comandos

## 📁 Estrutura do Projeto

```
ChippedReceivablesProtocol/
├── src/
│   └── ChippedReceivablesTracker.sol    # Contrato principal
├── script/
│   ├── Deploy.s.sol                     # Script de deploy
│   ├── Configure.s.sol                  # Script de configuração
│   ├── Interact.s.sol                   # Script de interação
│   └── run/
│       ├── deploy-protocol.sh           # Script principal
│       └── configure-environment.sh     # Configuração interativa
├── deployments/                         # Arquivos de deploy
├── Makefile                            # Comandos make
├── .env                                # Configuração (gerado)
└── README.md                           # Esta documentação
```

## 🔧 Funcionalidades do Protocolo

### Roles

- **ISSUER_ROLE**: Pode tokenizar recebíveis
- **VALIDATOR_ROLE**: Pode validar recebíveis
- **AUDITOR_ROLE**: Pode auditar e marcar como vencido
- **PAUSER_ROLE**: Pode pausar o protocolo
- **DEFAULT_ADMIN_ROLE**: Administrador completo

### Fluxo de Trabalho

1. **Tokenização**: Emissor cria recebível tokenizado
2. **Validação**: Validador verifica documentação
3. **Ativação**: Recebível fica ativo para pagamento
4. **Pagamento**: Registro de pagamentos (total/parcial)
5. **Vencimento**: Auditor marca como vencido se necessário
6. **Cancelamento**: Cancelamento com evidência

### Tipos de Documento

- NFE (Nota Fiscal Eletrônica)
- DUPLICATA
- BOLETO
- CONTRATO
- OUTROS

### Status dos Recebíveis

- **CREATED**: Recém criado
- **VALIDATED**: Validado pelo oracle
- **ACTIVE**: Ativo (aguardando pagamento)
- **PAID**: Pago
- **OVERDUE**: Vencido
- **CANCELLED**: Cancelado

## 📊 Monitoramento

### Status do Protocolo

```bash
# Ver status completo
./script/run/deploy-protocol.sh status

# Ou usando make
make status
```

### Logs e Debugging

```bash
# Ver logs dos scripts
make logs

# Verificar arquivos de deploy
ls -la deployments/
```

## 🛠️ Desenvolvimento

### Compilação

```bash
# Compilar contratos
make build

# Executar testes
make test
```

### Deploy em Outras Redes

1. Configure as variáveis de ambiente para a nova rede
2. Execute `./script/run/configure-environment.sh`
3. Execute `./script/run/deploy-protocol.sh all`

### Verificação de Contratos

```bash
# Verificar contrato deployado
make verify CONTRACT_ADDRESS=0x...
```

## 🔍 Exemplos de Uso

### Tokenização de Recebível

```solidity
// Parâmetros para tokenização
TokenizeParams memory params = TokenizeParams({
    documentNumber: "NFE-12345-2024",
    documentType: DocumentType.NFE,
    issuerName: "ACME Corp Ltda",
    issuerCNPJ: "12.345.678/0001-90",
    payerName: "Cliente Exemplo Ltda",
    payerCNPJ: "98.765.432/0001-10",
    originalValue: 50000, // R$ 500,00 (em centavos)
    dueDate: block.timestamp + 30 days,
    ipfsHash: "QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o",
    documentHash: keccak256("sample_document_content"),
    description: "Venda de produtos - NFE 12345"
});

// Tokenizar
uint256 tokenId = tracker.tokenizeReceivable(params);
```

### Validação de Recebível

```solidity
// Validar recebível
tracker.validateReceivable(
    tokenId,
    true, // isValid
    "Document verified successfully",
    0 // no value adjustment
);

// Ativar recebível
tracker.activateReceivable(
    tokenId,
    "Receivable activated for payment monitoring"
);
```

### Registro de Pagamento

```solidity
// Registrar pagamento
tracker.recordPayment(
    tokenId,
    25000, // R$ 250,00 (pagamento parcial)
    "PIX",
    "PIX-123456789",
    keccak256("payment_proof")
);
```

## 🚨 Solução de Problemas

### Erro: "Contrato não deployado"

```bash
# Execute primeiro o deploy
./script/run/deploy-protocol.sh deploy
```

### Erro: "Forge não encontrado"

```bash
# Instale o Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Erro: "jq não encontrado"

```bash
# Instale o jq
sudo apt-get install jq
```

### Limpar e Recomeçar

```bash
# Limpar tudo e recomeçar
./script/run/deploy-protocol.sh clean
./script/run/deploy-protocol.sh all
```

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique os logs: `make logs`
2. Verifique o status: `make status`
3. Consulte a documentação do contrato em `src/ChippedReceivablesTracker.sol`

## 📄 Licença

MIT License - veja o arquivo de licença para detalhes.