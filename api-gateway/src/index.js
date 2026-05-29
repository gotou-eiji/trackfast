// api-gateway/src/index.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(express.json());

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' }
});
app.use(limiter);

// ── Middleware de Autenticação JWT ────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-role'] = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// ── Rota pública: Login ───────────────────────────────────────
app.post('/auth/login', express.json(), (req, res) => {
  const { email, password, role } = req.body;
  // TODO: validar contra banco de dados
  // Aqui retornamos um token de exemplo para desenvolvimento
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha obrigatórios' });
  }

  const token = jwt.sign(
    { userId: 'user-123', email, role: role || 'buyer' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, role: role || 'buyer' });
});

// ── Proxies autenticados ──────────────────────────────────────
const SERVICES = {
  '/api/orders':        process.env.ORDER_SERVICE_URL        || 'http://localhost:3002',
  '/api/tracking':      process.env.TRACKING_SERVICE_URL     || 'http://localhost:3001',
  '/api/notifications': process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
  '/api/predict':       process.env.PREDICTION_SERVICE_URL   || 'http://localhost:8000',
};

Object.entries(SERVICES).forEach(([path, target]) => {
  app.use(path, authMiddleware, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: '' },
    on: {
      error: (err, req, res) => {
        console.error(`Erro no proxy ${path}:`, err.message);
        res.status(502).json({ error: 'Serviço indisponível' });
      }
    }
  }));
});

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.listen(PORT, () => console.log(`API Gateway rodando na porta ${PORT}`));
