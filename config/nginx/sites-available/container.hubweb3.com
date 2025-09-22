server {
    listen 80;
    listen [::]:80;
    server_name container.hubweb3.com;
    
    # Redireciona para HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
    
    # Para o desafio do Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name container.hubweb3.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/container.hubweb3.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/container.hubweb3.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/container.hubweb3.com/chain.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';
    ssl_ecdh_curve secp384r1;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logs
    access_log /var/log/nginx/container.hubweb3.com-access.log;
    error_log /var/log/nginx/container.hubweb3.com-error.log;

    # Desativa o buffering
    proxy_buffering off;
    proxy_request_buffering off;
    
    # Configurações de proxy
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-Port $server_port;
    
    # Configurações de tempo limite
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;
    
    # Desativa o buffering para WebSocket
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    
    # Configuração do proxy para o Portainer
    location / {
        proxy_pass http://127.0.0.1:9000;
        
        # Configurações adicionais para o Portainer
        proxy_set_header X-Forwarded-Host $http_host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        
        # WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Desativa o buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
