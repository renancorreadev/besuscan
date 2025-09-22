# 1. Storage Classes (recursos compartilhados)
kubectl apply -f k8s/shared/storage-classes/storage-classes.yaml

# 2. Namespace (ambiente isolado)
kubectl apply -f k8s/namespaces/dev-namespace.yaml

# 3. Volumes Persistentes (armazenamento)
kubectl apply -f k8s/dev/volumes/persistent-volumes.yaml

# 4. ConfigMaps (configurações)
kubectl apply -f k8s/dev/configmaps/app-config.yaml

# 5. Secrets (dados sensíveis)
kubectl apply -f k8s/dev/secrets/app-secrets.yaml

# 6. Services (rede interna)
kubectl apply -f k8s/dev/services/postgres-service.yaml
kubectl apply -f k8s/dev/services/rabbitmq-service.yaml
kubectl apply -f k8s/dev/services/redis-service.yaml
kubectl apply -f k8s/dev/services/api-service.yaml
kubectl apply -f k8s/dev/services/frontend-service.yaml
kubectl apply -f k8s/dev/services/indexer-service.yaml
kubectl apply -f k8s/dev/services/worker-service.yaml

# 7. Deployments - Infraestrutura primeiro
kubectl apply -f k8s/dev/deployments/postgres-deployment.yaml
kubectl apply -f k8s/dev/deployments/rabbitmq-deployment.yaml
kubectl apply -f k8s/dev/deployments/redis-deployment.yaml

# Aguardar infraestrutura ficar pronta
kubectl wait --for=condition=ready pod -l component=postgres -n besuscan-dev --timeout=300s
kubectl wait --for=condition=ready pod -l component=rabbitmq -n besuscan-dev --timeout=300s
kubectl wait --for=condition=ready pod -l component=redis -n besuscan-dev --timeout=300s

# 8. Deployments - Aplicação
kubectl apply -f k8s/dev/deployments/indexer-deployment.yaml
kubectl apply -f k8s/dev/deployments/worker-deployment.yaml
kubectl apply -f k8s/dev/deployments/api-deployment.yaml
kubectl apply -f k8s/dev/deployments/frontend-deployment.yaml

# 9. Ingress (roteamento externo)
kubectl apply -f k8s/dev/ingress/ingress.yaml