# TrackFast MVP

Plataforma de rastreamento logístico em tempo real — concorrente ao Mercado Livre.

## Estrutura do Projeto

```
trackfast/
├── api-gateway/          # Roteamento, Auth JWT, Rate Limiting (Node.js)
├── tracking-service/     # WebSocket GPS em tempo real (Node.js + Socket.IO)
├── order-service/        # CRUD de pedidos e eventos (Node.js + PostgreSQL)
├── notification-service/ # Notificações push multicanal (Node.js + Firebase)
├── prediction-service/   # ETA preditivo (Python + FastAPI)
├── frontend-web/         # Interface do comprador e vendedor (React + Leaflet)
├── mobile-app/           # App do entregador (React Native — a iniciar)
├── infra/                # Terraform e configs Kubernetes (a completar)
└── docker-compose.yml    # Ambiente local completo
```

## Pré-requisitos

- Docker + Docker Compose
- Node.js 20+
- Python 3.11+
- (Opcional) Firebase project para push notifications reais

## Rodando localmente

### 1. Subir toda a infraestrutura com Docker Compose

```bash
# Clone o repositório
git clone https://github.com/gotou-eiji/trackfast
cd trackfast

# Copie o arquivo de variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Firebase (opcional para dev)

# Sobe tudo: Postgres, Redis, Kafka, e todos os serviços
docker compose up --build
```

Serviços disponíveis:
- Prediction Service:   http://localhost:8000/docs
- Frontend Web:         http://localhost:5173

### 2. Rodando serviços individualmente (desenvolvimento)

```bash
# Só a infra (Postgres, Redis, Kafka)
docker compose up postgres redis kafka -d

# API Gateway
cd api-gateway && npm install && npm run dev

# Tracking Service
cd tracking-service && npm install && npm run dev

# Order Service
cd order-service && npm install && npm run dev

# Prediction Service
cd prediction-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend-web && npm install && npm run dev
```

### 3. Testando o fluxo completo

```bash
# 1. Faça login
Digite qualquer usuário \
  Digite qualquer senha \
  Escolha Comprador/Vendedor '

# 2. Escolha o pedido que deseja rastrear \
'
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
# Firebase (opcional para dev — ativa modo simulado se ausente)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@seu-project.iam.gserviceaccount.com

# JWT
JWT_SECRET=mude_isso_em_producao_use_256bits

# Docker Hub (para CI/CD)
DOCKER_USERNAME=seu_usuario
DOCKER_PASSWORD=seu_password
```

## Comandos úteis para rodar o MVP

- docker compose down
- docker compose build --no-cache frontend-web
- docker compose up
- npm install
npm run dev
