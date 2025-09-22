FROM node:20-alpine AS deps

WORKDIR /app

# Instalar apenas as dependências necessárias
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Estágio de build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copiar arquivos do projeto
COPY . .

# Build da aplicação
RUN yarn build

# Imagem final super leve
FROM node:20-alpine AS runner

WORKDIR /app

# Instalar apenas o servidor estático
RUN yarn global add http-server --production=true

# Copiar apenas os arquivos estáticos do build
COPY --from=builder /app/dist ./dist

# Limpar cache e arquivos desnecessários
RUN yarn cache clean && \
    rm -rf /root/.npm && \
    rm -rf /root/.yarn

# Usuário não-root para segurança
USER node

# Expor porta do servidor
EXPOSE 3000

# Iniciar servidor
CMD ["http-server", "dist", "-p", "3000", "--proxy", "http://localhost:3000?"] 