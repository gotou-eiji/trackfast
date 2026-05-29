// order-service/src/index.js
const express = require('express');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3002;

// ── PostgreSQL ────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://trackfast:trackfast123@localhost:5432/trackfast',
});

// ── Kafka ─────────────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'order-service-group' });

// ── Migrations (simples, use Prisma/Knex em produção) ─────────
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      buyer_id      TEXT NOT NULL,
      seller_id     TEXT NOT NULL,
      driver_id     TEXT,
      product_name  TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',
      origin_lat    DOUBLE PRECISION,
      origin_lng    DOUBLE PRECISION,
      dest_lat      DOUBLE PRECISION NOT NULL,
      dest_lng      DOUBLE PRECISION NOT NULL,
      dest_address  TEXT NOT NULL,
      eta_from      TIMESTAMPTZ,
      eta_to        TIMESTAMPTZ,
      eta_confidence DECIMAL(5,2),
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id   UUID REFERENCES orders(id),
      status     TEXT NOT NULL,
      notes      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Migrations executadas');
}

// ── Rotas ─────────────────────────────────────────────────────

// Criar pedido
app.post('/', async (req, res) => {
  const { buyerId, sellerId, productName, destLat, destLng, destAddress } = req.body;
  if (!buyerId || !productName || !destLat || !destLng || !destAddress) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  const { rows } = await pool.query(
    `INSERT INTO orders (buyer_id, seller_id, product_name, dest_lat, dest_lng, dest_address)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [buyerId, sellerId || 'seller-default', productName, destLat, destLng, destAddress]
  );
  const order = rows[0];

  await producer.send({
    topic: 'order.events',
    messages: [{ key: order.id, value: JSON.stringify({ ...order, event: 'created' }) }],
  });

  res.status(201).json(order);
});

// Listar pedidos do comprador
app.get('/buyer/:buyerId', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC`,
    [req.params.buyerId]
  );
  res.json(rows);
});

// Listar pedidos do vendedor
app.get('/seller/:sellerId', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM orders WHERE seller_id = $1 ORDER BY created_at DESC`,
    [req.params.sellerId]
  );
  res.json(rows);
});

// Buscar pedido por ID
app.get('/:orderId', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT o.*, 
            json_agg(oe ORDER BY oe.created_at) AS events
     FROM orders o
     LEFT JOIN order_events oe ON oe.order_id = o.id
     WHERE o.id = $1
     GROUP BY o.id`,
    [req.params.orderId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(rows[0]);
});

// Atualizar status do pedido
app.patch('/:orderId/status', async (req, res) => {
  const { status, driverId, notes } = req.body;
  const validStatuses = ['pending', 'collected', 'in_transit', 'nearby', 'delivered', 'failed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status inválido', valid: validStatuses });
  }

  const { rows } = await pool.query(
    `UPDATE orders SET status = $1, driver_id = COALESCE($2, driver_id), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [status, driverId, req.params.orderId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Pedido não encontrado' });

  await pool.query(
    `INSERT INTO order_events (order_id, status, notes) VALUES ($1, $2, $3)`,
    [req.params.orderId, status, notes]
  );

  await producer.send({
    topic: 'order.events',
    messages: [{
      key: req.params.orderId,
      value: JSON.stringify({ orderId: req.params.orderId, status, event: 'status_changed' })
    }],
  });

  res.json(rows[0]);
});

// Atualizar ETA (chamado pelo Prediction Service)
app.patch('/:orderId/eta', async (req, res) => {
  const { etaFrom, etaTo, etaConfidence } = req.body;
  const { rows } = await pool.query(
    `UPDATE orders SET eta_from = $1, eta_to = $2, eta_confidence = $3, updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [etaFrom, etaTo, etaConfidence, req.params.orderId]
  );
  res.json(rows[0]);
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── Consumer: escuta entrega confirmada do Tracking Service ───
async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'order.events', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      if (event.status === 'delivered') {
        await pool.query(
          `UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = $1`,
          [event.orderId]
        );
      }
    },
  });
}

// ── Boot ──────────────────────────────────────────────────────
async function start() {
  await migrate();
  await producer.connect();
  await startConsumer();
  app.listen(PORT, () => console.log(`Order Service rodando na porta ${PORT}`));
}
start();
