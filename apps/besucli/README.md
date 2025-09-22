# BesuCLI - BesuScan Command Line Interface

CLI poderoso para deploy e gerenciamento de smart contracts no Hyperledger Besu com integração completa ao BesuScan Explorer.

## 🚀 Novo: Deploy via YAML (Recomendado)

Agora você pode fazer deploy de contratos usando arquivos de configuração YAML, que é mais simples e organizado:

```bash
# Deploy usando arquivo YAML
besucli deploy token.yml
besucli deploy templates/counter.yml
```

### Exemplo de arquivo YAML (token.yml):

```yaml
# Informações básicas do contrato
contract:
  name: "TestCoin"
  symbol: "TEST"
  description: "Token de teste com informações completas"
  type: "ERC-20"

# Arquivos do contrato (apenas ABI e bytecode são obrigatórios)
files:
  abi: "templates/abis/ERC20.abi"
  bytecode: "templates/abis/ERC20.bin"

# Argumentos do construtor (em ordem)
constructor_args:
  - "TestCoin" # name
  - "TEST" # symbol
  - "18" # decimals
  - "2000000" # initial supply

# Configurações de compilação
compiler:
  version: "v0.8.19"
  optimization_enabled: true
  optimization_runs: 200

# Metadados do contrato
metadata:
  license: "MIT"
  website_url: ""
  github_url: ""
  documentation_url: ""
  tags:
    - "erc20"
    - "test"
    - "complete"

# Configurações de deploy
deploy:
  auto_verify: true
  save_deployment: true

# Configurações de gas (opcional)
gas:
  limit: 6000000
  price: "0" # Gas gratuito para Besu
```

# Command para solc

```sh
solc --evm-version london --bin --abi  templates/smart-contracts/ERC20Token.sol -o templates/abis/ --overwrite
solc --bin --abi  templates/smart-contracts/VFinance.sol -o templates/abis/ --overwrite
solc --bin --abi  templates/smart-contracts/DIDRegistry.sol -o templates/abis/ --overwrite
solc --bin --abi  templates/smart-contracts/RegistryAccess.sol -o templates/abis/ --overwrite
solc --bin --abi  templates/smart-contracts/StatusListManager.sol -o templates/abis/ --overwrite

solc --evm-version london --bin --abi  templates/smart-contracts/DIDW3C.sol -o templates/abis/ --overwrite --optimize


solc --evm-version london --bin --abi  templates/smart-contracts/VocabChain.sol -o templates/abis/ --overwrite --optimize

```

# Comandos de deploy:

## Deploy via YAML (Recomendado):

```bash
# Deploy de token ERC-20
./bin/contract deploy token.yml

# Deploy de contrato Counter
./bin/contract deploy counter.yml
```

## Deploy tradicional via flags:

```bash
besucli deploy --name "TestCoin" --symbol "TEST" --description "Token de teste com informações completas" --type "ERC-20" --contract templates/ERC20.sol --abi templates/ERC20Token.abi --bytecode templates/ERC20Token.bin --args "TestCoin" --args "TEST" --args "18" --args "2000000" --tags "erc20,test,complete" --license "MIT" --auto-verify
```

```bash
./bin/contract deploy --name "Counter" --symbol "Counter" --description "Token de teste para executar transacoes v2" --type "Custom" --contract templates/Counter.sol --abi templates/abis/Counter.abi --bytecode templates/abis/Counter.bin --tags "custom,test,complete" --license "MIT" --auto-verify
```

```bash
besucli deploy --name "VocabChain" --symbol "VCHAIN" --description "Smart Contract para registro e acompanhamento de estudos de ingles" --type "Learning" --contract templates/smart-contracts/VocabChain.sol --abi templates/abis/VocabChain.abi --bytecode templates/abis/VocabChain.bin  --license "MIT" --auto-verify
```


```bash
besucli deploy --name "CredentialRegistry" --symbol "DID" --description "Smart Contract para registro e acompanhamento de credenciais" --type "VCA" --contract templates/smart-contracts/IDBraDIDRegistry.sol --abi templates/abis/IDBraDIDRegistry.abi --bytecode templates/abis/IDBraDIDRegistry.bin --args "0xB40061C7bf8394eb130Fcb5EA06868064593BFAa"  --license "MIT" --auto-verify
```

## 🚀 Características

- **Deploy Automatizado**: Deploy com verificação automática
- **Verificação Inteligente**: Sistema de verificação similar ao Etherscan
- **Integração Completa**: Integração direta com a API do BesuScan
- **Metadados Ricos**: Suporte para descrições, tags, URLs e metadados
- **Templates**: Templates pré-configurados para contratos comuns
- **Interação**: Chamadas de funções read/write
- **Configuração Flexível**: Configuração via YAML
- **🆕 Proxy UUPS**: Suporte completo para contratos upgradeable
- **🆕 Importação de Contratos**: Importar contratos já deployados na rede
- **🆕 Gerenciamento de Proxies**: Deploy, upgrade e administração
- **🆕 Detecção Automática**: Identifica tipos de proxy automaticamente

## 🆕 Novas Funcionalidades: Proxy UUPS e Contratos Deployados

### Proxy UUPS

O BesuCLI agora suporta contratos proxy UUPS para contratos upgradeable:

```bash
# Deploy de proxy UUPS
besucli proxy deploy --implementation 0x456... --type UUPS --owner 0x789...

# Deploy via YAML
besucli proxy deploy uups-proxy.yml

# Informações do proxy
besucli proxy info 0x123...

# Upgrade de proxy
besucli proxy upgrade 0x123... 0x456... --reason "Bug fix"
```

### Importação de Contratos

Importe contratos já deployados na rede:

```bash
# Importar contrato via YAML
besucli import contract-import.yml

# Importar contrato via flags
besucli import --address 0x123... --name "MyToken" --type "ERC-20"

# Importar contrato proxy
besucli import --address 0x123... --name "MyTokenProxy" --is-proxy --proxy-type "UUPS"
```

### Gerenciamento de Proxies

Comandos para administrar contratos proxy:

```bash
# Alterar admin (Transparent Proxy)
besucli proxy admin change-admin 0x123... 0x456...

# Transferir ownership (UUPS Proxy)
besucli proxy admin transfer-ownership 0x123... 0x456...

# Renunciar ownership
besucli proxy admin renounce-ownership 0x123...
```

### Gerenciamento de Contratos

Comandos para gerenciar contratos deployados:

```bash
# Informações do contrato
besucli contracts info 0x123...

# Verificar contrato existente
besucli contracts verify 0x123... --source MyToken.sol --abi MyToken.abi

# Exportar contrato
besucli contracts export 0x123... --format json --include-abi

# Buscar contratos
besucli contracts search "token" --type "ERC-20" --verified
```

Para mais detalhes sobre as novas funcionalidades, consulte [PROXY_UUPS_README.md](PROXY_UUPS_README.md).

## 📁 Estrutura do Projeto

```
apps/besucli/
├── bin/                    # Binários compilados
├── cmd/                    # Código fonte principal
│   └── main.go            # Aplicação CLI principal
├── configs/               # Arquivos de configuração
│   └── besucli.example.yaml
├── scripts/               # Scripts de instalação e exemplos
│   ├── install.sh         # Script de instalação
│   └── deploy-erc20.sh    # Exemplo de deploy
├── templates/             # Templates de contratos
│   └── ERC20.sol          # Template ERC-20
├── Dockerfile            # Build Docker de produção
├── Makefile              # Comandos de build e instalação
├── go.mod                # Dependências Go
└── README.md             # Esta documentação
```

## 🛠️ Instalação

### Instalação Rápida

```bash
# Clone o repositório (se ainda não tiver)
git clone <repository-url>
cd apps/contract-cli

# Instalação completa com configuração automática
make setup
```

### Instalação Manual

```bash
# 1. Compilar e instalar
make install

# 2. Configurar PATH (se necessário)
make setup-path

# 3. Verificar instalação
make check
```

### Usando Script de Instalação

```bash
# Executar script de instalação
chmod +x scripts/install.sh
./scripts/install.sh
```

## ⚙️ Configuração

### 1. Configuração Inicial

```bash
# Configurar carteira
contract config set-wallet

# Configurar rede
contract config set-network

# Verificar configuração
contract config show
```

### 2. Arquivo de Configuração

Copie `config/contract-cli.example.yaml` para `~/.contract-cli.yaml` e configure:

```yaml
network:
  rpc_url: "http://144.22.179.183"
  name: "besu-local"
  chain_id: 1337

api:
  base_url: "http://localhost:8080/api"

wallet:
  private_key: "sua_chave_privada_aqui"

gas:
  limit: 6000000
  price: "20000000000"
```

## 🚀 Uso

### Deploy de Contratos

```bash
# Deploy básico
contract deploy --contract templates/ERC20.sol \
  --name "Meu Token" \
  --symbol "MTK" \
  --description "Token de exemplo"

# Deploy com parâmetros avançados
contract deploy \
  --contract templates/ERC20.sol \
  --name "BesuScan Token" \
  --symbol "BST" \
  --description "Token oficial do BesuScan" \
  --contract-type "ERC20" \
  --constructor-args "BesuScan Token,BST,18,1000000,0x..." \
  --tags "erc20,token,official" \
  --license-type "MIT" \
  --website-url "https://besuscan.com" \
  --auto-verify
```

### Verificação de Contratos

```bash
# Verificar contrato existente
contract verify 0x1234... \
  --contract templates/ERC20.sol \
  --name "Meu Token" \
  --constructor-args "arg1,arg2,arg3"
```

### Interação com Contratos

```bash
# Listar funções disponíveis
contract interact 0x1234... --functions

# Chamar função read
contract interact 0x1234... --read balanceOf 0x5678...

# Chamar função write
contract interact 0x1234... --write transfer 0x5678... 1000000000000000000
```

### Listagem e Busca

```bash
# Listar todos os contratos
contract list

# Listar contratos verificados
contract list --verified

# Buscar contratos
contract list --search "token"
```

## 📋 Comandos Disponíveis

### Deploy

- `contract deploy` - Deploy de novos contratos
- `contract verify` - Verificar contratos existentes

### Interação

- `contract interact` - Interagir com contratos
- `contract list` - Listar contratos

### Configuração

- `contract config set-wallet` - Configurar carteira
- `contract config set-network` - Configurar rede
- `contract config show` - Mostrar configuração atual

### 🆕 Novos Comandos

- `import` - Importar contratos já deployados na rede
- `proxy` - Gerenciar contratos proxy (UUPS, Transparent, Beacon)
- `upgrade` - Upgrade de contratos proxy
- `contracts` - Gerenciar contratos deployados

## 🔧 Comandos Make

```bash
# Build e Instalação
make build         # Compilar localmente
make install       # Instalar globalmente
make setup         # Instalação + configuração completa
make setup-path    # Configurar PATH

# Verificação
make check         # Verificar instalação
make test          # Executar testes

# Desenvolvimento
make run ARGS='--help'  # Executar sem instalar
make clean         # Limpar arquivos temporários
make help          # Ver todos os comandos
```

## 📝 Templates

### ERC-20 Token

```bash
# Deploy usando template ERC-20
contract deploy --contract templates/ERC20.sol \
  --name "Meu Token" \
  --symbol "MTK" \
  --constructor-args "Meu Token,MTK,18,1000000,0x..."
```
