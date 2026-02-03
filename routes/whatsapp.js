import express from 'express';
import { whatsappManager } from '../services/whatsapp-manager.js';

const router = express.Router();

router.get('/:botId/status', (req, res) => {
  const { botId } = req.params;
  const session = whatsappManager.getStatus(botId);
  res.json(session);
});

router.post('/:botId/connect', async (req, res) => {
  const { botId } = req.params;
  const session = await whatsappManager.connect(botId, {});

  if (session.status === 'error') {
    return res.status(400).json({ error: session.error || 'فشل الربط.' });
  }

  return res.json({ success: true, session });
});

router.post('/:botId/disconnect', async (req, res) => {
  const { botId } = req.params;
  const session = await whatsappManager.disconnect(botId);
  res.json({ success: true, session });
});

export default router;
