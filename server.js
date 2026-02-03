import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import botsRoutes from './routes/bots.js';
import promptsRoutes from './routes/prompts.js';
import analyticsRoutes from './routes/analytics.js';
import conversationsRoutes from './routes/conversations.js';
import filesRoutes from './routes/files.js';
import whatsappRoutes from './routes/whatsapp.js';
import messengerRoutes from './routes/messenger.js';
import instagramRoutes from './routes/instagram.js';
import config from './config.js';

const app = express();
const PORT = config.server.port;

const corsOptions =
  config.server.allowedOrigins.includes('*')
    ? { origin: true }
    : { origin: config.server.allowedOrigins };

app.use(cors(corsOptions));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.limits.rateLimitPerMinute
});
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/messenger', messengerRoutes);
app.use('/api/instagram', instagramRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    ai: 'OpenRouter',
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('🤖 AI: OpenRouter');
});
