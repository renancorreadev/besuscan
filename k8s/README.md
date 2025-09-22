# 🚀 BeSuScan - Kubernetes DevOps Architecture

Este documento descreve a arquitetura completa de DevOps para o BeSuScan Block Explorer usando Kubernetes.

## 📋 Visão Geral da Arquitetura

O BeSuScan é um block explorer completo para Hyperledger Besu estruturado como um monorepo com os seguintes serviços:

### 🏗️ Serviços da Aplicação
- **Indexer** (Go) - Escuta eventos do Besu e envia para o Worker via RabbitMQ
- **Worker** (Go) - Processa eventos do Indexer e salva no PostgreSQL
- **API** (Go) - Disponibiliza dados do PostgreSQL via REST API
- **Frontend** (React/Vite) - Interface web do explorer
- **BeSuCLI** (Go) - CLI para deploy e interação com smart contracts

### 🔧 Infraestrutura
- **PostgreSQL** - Banco de dados principal
- **RabbitMQ** - Message broker para comunicação assíncrona
- **Redis** - Cache e sessões
- **Nginx** - Proxy reverso e load balancer

## 🌍 Ambientes

### 🧪 Desenvolvimento (dev)
- **Domínio**: besuscan.hubweb3.com
- **Hot Reload**: Habilitado para todos os serviços
- **Debugging**: Portas expostas para debug
- **Recursos**: Configuração mínima para desenvolvimento

### 🏭 Produção (prod)
- **Domínio**: besuscan.com
- **Performance**: Otimizado para produção
- **Segurança**: SSL/TLS, secrets, network policies
- **Recursos**: Configuração otimizada com limites e requests

## 📁 Estrutura de Diretórios

```
k8s/
├── README.md                    # Este arquivo
├── namespaces/                  # Definição de namespaces
│   ├── dev-namespace.yaml
│   └── prod-namespace.yaml
├── dev/                         # Ambiente de desenvolvimento
│   ├── configmaps/
│   ├── secrets/
│   ├── deployments/
│   ├── services/
│   ├── ingress/
│   └── volumes/
├── prod/                        # Ambiente de produção
│   ├── configmaps/
│   ├── secrets/
│   ├── deployments/
│   ├── services/
│   ├── ingress/
│   └── volumes/
├── shared/                      # Recursos compartilhados
│   ├── storage-classes/
│   └── network-policies/
└── scripts/                     # Scripts de automação
    ├── deploy-dev.sh
    ├── deploy-prod.sh
    └── cleanup.sh
```

## 🔄 Pipeline CI/CD

### 🌊 Fluxo de Desenvolvimento
1. **Commit** → Branch `develop`
2. **Build** → Construção das imagens Docker
3. **Test** → Execução de testes automatizados
4. **Deploy** → Deploy automático no ambiente de desenvolvimento

### 🚀 Fluxo de Produção
1. **Tag** → Criação de tag de versão
2. **Build** → Construção das imagens Docker com tag
3. **Test** → Execução completa de testes
4. **Deploy** → Deploy manual no ambiente de produção

## 📊 Monitoramento e Observabilidade

### 📈 Métricas
- **Prometheus** - Coleta de métricas
- **Grafana** - Visualização de métricas
- **AlertManager** - Alertas automáticos

### 📝 Logs
- **Fluentd** - Coleta de logs
- **Elasticsearch** - Armazenamento de logs
- **Kibana** - Visualização de logs

## 🔐 Segurança

### 🛡️ Práticas Implementadas
- **Network Policies** - Isolamento de rede entre serviços
- **RBAC** - Controle de acesso baseado em roles
- **Secrets Management** - Gerenciamento seguro de credenciais
- **SSL/TLS** - Criptografia de dados em trânsito
- **Container Security** - Imagens base seguras e scanning

## 🚀 Como Usar

### 📋 Pré-requisitos
- Kubernetes cluster configurado
- kubectl instalado e configurado
- Docker registry configurado
- Domínios DNS configurados

### 🏃‍♂️ Deploy Rápido

```bash
# Desenvolvimento
./scripts/deploy-dev.sh

# Produção
./scripts/deploy-prod.sh
```

### 🔧 Comandos Úteis

```bash
# Ver status dos pods
kubectl get pods -n besuscan-prod

# Ver logs de um serviço
kubectl logs -f deployment/indexer -n besuscan-dev

# Acessar shell de um pod
kubectl exec -it deployment/api -n besuscan-dev -- /bin/sh

# Aplicar configurações
kubectl apply -f k8s/dev/
kubectl apply -f k8s/prod/
```

## 📚 Próximos Passos

1. **Configurar Registry** - Setup do Docker registry
2. **Configurar DNS** - Apontar domínios para o cluster
3. **Configurar SSL** - Certificados SSL/TLS
4. **Configurar Monitoramento** - Prometheus + Grafana
5. **Configurar Backup** - Backup automático do PostgreSQL
6. **Configurar Alertas** - Alertas para problemas críticos

## 🤝 Contribuindo

Para contribuir com melhorias na infraestrutura:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Teste as mudanças no ambiente de desenvolvimento
4. Submeta um Pull Request

## 📞 Suporte

Para dúvidas sobre a infraestrutura Kubernetes:

- Documentação completa em cada arquivo YAML
- Comentários detalhados explicando cada configuração
- Scripts de automação com logs detalhados 