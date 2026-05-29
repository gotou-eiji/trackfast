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
- API Gateway:          http://localhost:3000
- Tracking Service:     http://localhost:3001
- Order Service:        http://localhost:3002
- Notification Service: http://localhost:3003
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
# 1. Faça login e pegue o token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"comprador@email.com","password":"123","role":"buyer"}'

# 2. Crie um pedido (substitua TOKEN pelo token recebido)
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "user-123",
    "sellerId": "seller-456",
    "productName": "Tênis Nike Air",
    "destLat": -23.5505,
    "destLng": -46.6333,
    "destAddress": "Av. Paulista, 1578, São Paulo"
  }'

# 3. Consulte a previsão de entrega
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORDER_ID_AQUI",
    "origin_lat": -23.5489,
    "origin_lng": -46.6388,
    "dest_lat": -23.5505,
    "dest_lng": -46.6333,
    "carrier": "jadlog"
  }'

# 4. Abra o frontend e acesse /track/ORDER_ID_AQUI para ver o mapa
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

## Arquitetura

```
Clientes (Web/Mobile)
        │
   API Gateway :3000  ← Auth JWT + Rate Limit
        │
   ┌────┴─────────────────────┐
   │                          │
Tracking :3001          Order :3002
(WebSocket + GPS)      (CRUD Pedidos)
   │                          │
   └──────────┬───────────────┘
              │
           Kafka
              │
   ┌──────────┴────────────┐
   │                       │
Notification :3003    Prediction :8000
(Push/WhatsApp)       (ETA via FastAPI)
              │
   ┌──────────┴────────────┐
Redis (cache GPS)   PostgreSQL (dados)
```

## Próximos passos

- [ ] Implementar App Mobile do entregador (React Native)
- [ ] Adicionar testes unitários com Jest e Pytest
- [ ] Configurar Terraform para infra AWS
- [ ] Integrar Google Maps API para rotas reais
- [ ] Adicionar WhatsApp Business API
- [ ] Implementar modelo ML real com scikit-learn
