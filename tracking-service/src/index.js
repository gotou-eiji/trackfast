// tracking-service/src/index.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { Kafka } = require('kafkajs');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// ── Redis ─────────────────────────────────────────────────────
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', err => console.error('Redis error:', err));

// ── Kafka Producer ────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'tracking-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});
const producer = kafka.producer();

// ── Socket.IO ─────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Cada pedido tem sua própria "sala" no Socket.IO
// Entregador entra na sala do pedido e emite posição
// Comprador se inscreve na sala do pedido e recebe posição

io.on('connection', (socket) => {
  console.log(`Nova conexão: ${socket.id}`);

  // Entregador começa a transmitir GPS de um pedido
  socket.on('driver:join', ({ orderId, driverId }) => {
    socket.join(`order:${orderId}`);
    socket.data = { orderId, driverId, role: 'driver' };
    console.log(`Entregador ${driverId} entrou no pedido ${orderId}`);
  });

  // Comprador se inscreve para acompanhar um pedido
  socket.on('buyer:watch', ({ orderId }) => {
    socket.join(`order:${orderId}`);
    socket.data = { orderId, role: 'buyer' };

    // Envia última posição conhecida do cache
    redis.get(`gps:${orderId}`).then(cached => {
      if (cached) socket.emit('gps:update', JSON.parse(cached));
    });
  });

  // Entregador envia nova posição GPS
  socket.on('gps:update', async ({ orderId, lat, lng, speed, heading }) => {
    if (socket.data.role !== 'driver') return;

    const payload = {
      orderId,
      lat,
      lng,
      speed,
      heading,
      timestamp: new Date().toISOString(),
    };

    // Salva no Redis como última posição conhecida (TTL 1 hora)
    await redis.setEx(`gps:${orderId}`, 3600, JSON.stringify(payload));

    // Broadcast para todos os compradores assistindo esse pedido
    socket.to(`order:${orderId}`).emit('gps:update', payload);

    // Publica no Kafka para outros serviços (ex: Prediction Service)
    await producer.send({
      topic: 'gps.updates',
      messages: [{ key: orderId, value: JSON.stringify(payload) }],
    });
  });

  // Entregador confirma entrega com foto
  socket.on('delivery:confirm', async ({ orderId, photoBase64, notes }) => {
    const event = {
      orderId,
      status: 'delivered',
      photoBase64,
      notes,
      timestamp: new Date().toISOString(),
    };

    // Notifica comprador
    io.to(`order:${orderId}`).emit('delivery:confirmed', event);

    // Publica no Kafka para o Order Service atualizar o status
    await producer.send({
      topic: 'order.events',
      messages: [{ key: orderId, value: JSON.stringify(event) }],
    });
  });

  socket.on('disconnect', () => {
    console.log(`Desconectado: ${socket.id}`);
  });
});

// ── REST: última posição de um pedido ─────────────────────────
app.get('/position/:orderId', async (req, res) => {
  const cached = await redis.get(`gps:${req.params.orderId}`);
  if (!cached) return res.status(404).json({ error: 'Posição não encontrada' });
  res.json(JSON.parse(cached));
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── Boot ──────────────────────────────────────────────────────
async function start() {
  await redis.connect();
  await producer.connect();
  httpServer.listen(PORT, () =>
    console.log(`Tracking Service rodando na porta ${PORT}`)
  );
}
start();
