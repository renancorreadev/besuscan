kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# instalar metal llb para provisionar ip 

kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.2/config/manifests/metallb-native.yaml

#aplicar 

kubectl apply -f k8s/metallb-ip-pool.yaml

#alterar pra loadbalancer
kubectl patch service ingress-nginx-controller -n ingress-nginx -p '{"spec": {"type": "LoadBalancer"}}'