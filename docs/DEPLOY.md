# 🚀 Sistema de Deploy Automático

Este documento explica como usar o sistema de deploy automático com tagging para os serviços do NXplorer.

## 📋 Visão Geral

O sistema permite fazer deploy automático de qualquer serviço em dois ambientes (dev/prod) usando um comando simples que:

1. **Cria uma tag Git** no formato `servico-ambiente-versao`
2. **Aciona automaticamente** a pipeline do Bitbucket
3. **Constrói e publica** a imagem Docker no Docker Hub

## 🎯 Uso Básico

### Formato do Comando
```bash
make <serviço> <ambiente> <versão>
```

### Exemplos Práticos
```bash
# Deploy do worker em desenvolvimento
make worker dev 1.0.2

# Deploy da API em produção  
make api prod 2.1.0

# Deploy do frontend em desenvolvimento
make frontend dev 0.5.3

# Deploy do indexer em produção
make indexer prod 1.2.1

# Deploy do besucli em produção
make besucli prod 3.0.0
```

## 📦 Serviços Disponíveis

- **worker** - Processador de transações
- **indexer** - Indexador de blocos
- **api** - API REST
- **frontend** - Interface web
- **besucli** - Ferramenta de linha de comando

## 🌍 Ambientes

- **dev** - Desenvolvimento (usa `Dockerfile.dev`)
- **prod** - Produção (usa `Dockerfile`)

## 🔖 Sistema de Versionamento

- **Formato obrigatório**: `x.y.z` (versionamento semântico)
- **Exemplos válidos**: `1.0.0`, `2.1.5`, `0.5.2`
- **Exemplos inválidos**: `v1.0.0`, `1.0`, `latest`

## 🐳 Imagens Docker Geradas

### Desenvolvimento
- **Nome**: `besuscan/<serviço>-dev`
- **Tags**: `latest` e `v<versão>`
- **Exemplo**: `besuscan/worker-dev:v1.0.2`

### Produção  
- **Nome**: `besuscan/<serviço>`
- **Tags**: `latest` e `v<versão>`
- **Exemplo**: `besuscan/worker:v1.0.2`

## 🔧 Comandos de Gerenciamento

### Listar Tags Existentes
```bash
make list-tags
```

### Ver Status dos Deploys
```bash
make deploy-status
```

### Verificar Pipeline
```bash
make check-pipeline
```

### Remover Tag
```bash
make delete-tag TAG=worker-dev-1.0.1
```

## 🔄 Fluxo Completo

1. **Desenvolvimento local** → Teste suas mudanças
2. **Commit e push** → Envie o código para o repositório
3. **Deploy de desenvolvimento** → `make worker dev 1.0.2`
4. **Teste no ambiente dev** → Valide as mudanças
5. **Deploy de produção** → `make worker prod 1.0.2`

## 📊 Monitoramento

### Bitbucket Pipelines
- Acesse: **Bitbucket → Pipelines**
- Monitore o progresso do build
- Verifique logs de erro se necessário

### Docker Hub
- Acesse: https://hub.docker.com/u/besuscan
- Confirme que a imagem foi publicada
- Teste o pull da imagem

### Testando Localmente
```bash
# Baixar e testar a imagem
docker pull besuscan/worker-dev:v1.0.2
docker run besuscan/worker-dev:v1.0.2
```

## ⚠️ Validações Automáticas

O sistema inclui validações para:

- ✅ **Formato da versão** (x.y.z)
- ✅ **Ambiente válido** (dev/prod)
- ✅ **Serviço existente** (pasta em apps/)
- ✅ **Tag única** (não duplicada)
- ✅ **Confirmação do usuário** antes de criar tag

## 🚨 Solução de Problemas

### Tag já existe
```bash
# Remover tag existente
make delete-tag TAG=worker-dev-1.0.1

# Ou usar uma versão diferente
make worker dev 1.0.2
```

### Pipeline falhou
1. Verifique os logs no Bitbucket Pipelines
2. Confirme que `DOCKER_USERNAME` e `DOCKER_PASSWORD` estão configurados
3. Verifique se o Dockerfile existe na pasta do serviço

### Imagem não aparece no Docker Hub
1. Verifique se a pipeline terminou com sucesso
2. Confirme as credenciais do Docker Hub
3. Verifique se o repositório existe

## 🔐 Configuração Necessária

### Variáveis no Bitbucket

Configure estas variáveis em **Repository Settings → Pipelines → Repository variables**:

- `DOCKER_USERNAME` - Seu usuário do Docker Hub
- `DOCKER_PASSWORD` - Sua senha/token do Docker Hub

### Estrutura dos Serviços

Cada serviço deve ter:
```
apps/
├── worker/
│   ├── Dockerfile      # Para produção
│   ├── Dockerfile.dev  # Para desenvolvimento  
│   └── Makefile        # Com targets 'dev' e 'prod'
├── api/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── Makefile
└── ...
```

## 💡 Dicas

1. **Use versionamento semântico** para facilitar o controle
2. **Teste sempre em dev** antes de fazer deploy em prod
3. **Monitore os logs** da pipeline para detectar problemas
4. **Mantenha um changelog** das versões para rastreabilidade
5. **Use `make deploy-status`** para ter uma visão geral

## 📝 Exemplo Completo

```bash
# 1. Verificar status atual
make deploy-status

# 2. Fazer deploy em desenvolvimento
make worker dev 1.2.3

# 3. Verificar se a pipeline rodou
make check-pipeline

# 4. Testar a imagem
docker pull besuscan/worker-dev:v1.2.3

# 5. Deploy em produção
make worker prod 1.2.3

# 6. Verificar tags criadas
make list-tags
```

---

🎉 **Pronto!** Agora você tem um sistema de deploy totalmente automatizado e rastreável! 