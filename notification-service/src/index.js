// notification-service/src/index.js
const express = require('express');
const { Kafka } = require('kafkajs');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3003;

// ── Firebase Admin (Push Notifications) ──────────────────────
// Para desenvolvimento, pode comentar essa inicialização
// e usar o modo simulado abaixo
let firebaseReady = false;
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  firebaseReady = true;
  console.log('Firebase Admin inicializado');
} catch {
  console.warn('Firebase não configurado — modo simulado ativado');
}

// ── Templates de notificação por evento ──────────────────────
const TEMPLATES = {
  collected: {
    title: '📦 Pedido coletado!',
    body: (order) => `Seu pedido "${order.productName}" foi coletado e está a caminho.`,
  },
  in_transit: {
    title: '🚚 Em trânsito',
    body: (order) => `Seu pedido está em rota de entrega. Previsão: ${order.etaRange || 'em breve'}.`,
  },
  nearby: {
    title: '📍 Entregador próximo!',
    body: () => 'Seu entregador está a poucos minutos de você. Fique atento!',
  },
  delivered: {
    title: '✅ Entrega realizada!',
    body: (order) => `Seu pedido "${order.productName}" foi entregue com sucesso.`,
  },
  failed: {
    title: '⚠️ Tentativa de entrega',
    body: () => 'Não foi possível realizar a entrega. Reagendaremos em breve.',
  },
};

// ── Função de envio ───────────────────────────────────────────
async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!firebaseReady) {
    console.log(`[SIMULADO] Push para ${fcmToken}:`, { title, body });
    return { simulated: true };
  }

  return admin.messaging().send({
    token: fcmToken,
    notification: { title, body },
    data,
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });
}

// ── REST: envio manual de notificação ─────────────────────────
app.post('/send', async (req, res) => {
  const { fcmToken, title, body, data } = req.body;
  if (!fcmToken || !title || !body) {
    return res.status(400).json({ error: 'fcmToken, title e body são obrigatórios' });
  }
  try {
    const result = await sendPushNotification(fcmToken, title, body, data);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok', firebase: firebaseReady }));

// ── Kafka Consumer: escuta eventos de pedidos ─────────────────
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});
const consumer = kafka.consumer({ groupId: 'notification-service-group' });

// Mapa em memória de tokens FCM por usuário (em produção: use banco)
// Estrutura: { userId: fcmToken }
const fcmTokens = new Map();

// REST: registrar token FCM
app.post('/register-token', (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken) return res.status(400).json({ error: 'userId e fcmToken obrigatórios' });
  fcmTokens.set(userId, fcmToken);
  res.json({ success: true });
});

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'order.events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      const { status, buyerId, productName, etaFrom, etaTo } = event;

      const template = TEMPLATES[status];
      if (!template) return;

      const order = {
        productName,
        etaRange: etaFrom && etaTo
          ? `${new Date(etaFrom).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(etaTo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          : null,
      };

      const title = template.title;
      const body = template.body(order);

      // Enviar para o comprador
      const buyerToken = fcmTokens.get(buyerId);
      if (buyerToken) {
        await sendPushNotification(buyerToken, title, body, {
          orderId: event.orderId,
          status,
        });
      } else {
        console.log(`[Notificação] Usuário ${buyerId} sem token. Mensagem: ${title} - ${body}`);
      }
    },
  });
}

async function start() {
  await startConsumer();
  app.listen(PORT, () => console.log(`Notification Service rodando na porta ${PORT}`));
}
start();
