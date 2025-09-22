# Verificar primeiramente os pods 
> kubectl get pods -n besuscan-prod

# Verificar servicos do pods 

kubectl get services -n besuscan-prod | grep -E "(rabbit|amqp)"

# Restart um servico 

kubectl rollout restart deployment/api-deployment -n besuscan-prod

kubectl rollout status deployment/api-deployment -n besuscan-prod

# Get pod api

kubectl get pods -n besuscan-prod | grep api