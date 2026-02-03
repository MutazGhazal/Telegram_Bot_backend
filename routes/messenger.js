import express from 'express';
import config from '../config.js';
import { db } from '../database.js';
import { ai } from '../services/ai-handler.js';

const router = express.Router();

router.get('/:botId', async (req, res) => {
  try {
    const session = await db.getMessengerSession(req.params.botId);
    res.json(session || { status: 'disconnected' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:botId/connect', async (req, res) => {
  try {
    const { botId } = req.params;
    const { page_id, page_access_token, webhook_url } = req.body || {};
    const session = await db.saveMessengerSession(botId, {
      page_id,
      page_access_token,
      webhook_url,
      status: 'connected'
    });

    if (!session) {
      return res.status(400).json({ error: 'فشل حفظ بيانات مسنجر' });
    }

    return res.json({ success: true, session });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/:botId/disconnect', async (req, res) => {
  try {
    const session = await db.updateMessengerStatus(req.params.botId, 'disconnected');
    return res.json({ success: true, session });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.messenger.verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (body.object !== 'page') {
      return res.sendStatus(404);
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const pageId = entry.id;
      const session = await db.getMessengerSessionByPage(pageId);
      if (!session?.page_access_token || !session?.bot_id) {
        continue;
      }

      const messaging = entry.messaging || [];
      for (const event of messaging) {
        const senderId = event?.sender?.id;
        const message = event?.message;
        if (!senderId || !message || message.is_echo) {
          continue;
        }

        const text = message.text?.trim();
        if (!text) continue;

        const promptData = await db.getPrompt(session.bot_id);
        const systemPrompt = promptData?.prompt_text || null;
        const convId = `messenger:${session.bot_id}:${senderId}`;
        const { text: reply } = await ai.generate(text, systemPrompt, convId);

        const url = `https://graph.facebook.com/${config.messenger.apiVersion}/me/messages?access_token=${session.page_access_token}`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: reply || '...' }
          })
        });
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error('Messenger webhook error:', error);
    return res.sendStatus(500);
  }
});

export default router;
